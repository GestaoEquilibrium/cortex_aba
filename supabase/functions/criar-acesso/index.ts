// ============================================================================
// CORTEX aba — Edge Function: criar-acesso
// ----------------------------------------------------------------------------
// Cria a conta de acesso de um profissional ou responsável direto pelo sistema,
// sem ninguém precisar abrir o painel do Supabase.
//
// POR QUE UMA FUNÇÃO E NÃO NO NAVEGADOR:
// criar usuário exige a service_role key, que tem poder total sobre o banco.
// Ela fica guardada como segredo aqui no servidor e nunca chega ao navegador.
//
// A função sempre verifica QUEM está pedindo antes de criar:
//   - profissional  → só direção
//   - responsável   → direção, coordenação ou recepção
//
// Ações:
//   { acao: 'criar',    tipo: 'profissional'|'responsavel', registro_id }
//   { acao: 'redefinir', tipo: ..., registro_id }
//   { acao: 'remover',  tipo: ..., registro_id }   -> desvincula o acesso
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function responder(corpo: unknown, status = 200) {
    return new Response(JSON.stringify(corpo), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' }
    });
}

// Senha temporária legível: a coordenação vai ditar isso por telefone.
// Sem caracteres ambíguos (0/O, 1/l) para não gerar confusão.
function senhaTemporaria(): string {
    const letras = 'abcdefghijkmnpqrstuvwxyz';
    const maius  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums   = '23456789';
    const sorteia = (s: string, n: number) =>
        Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
    return sorteia(maius, 2) + sorteia(letras, 4) + sorteia(nums, 3);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

    try {
        const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
        const ANON         = Deno.env.get('SUPABASE_ANON_KEY')!;
        const SERVICE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const autorizacao = req.headers.get('Authorization');
        if (!autorizacao) return responder({ erro: 'Sem autenticação.' }, 401);

        // 1. Quem está pedindo? Cliente com o JWT de quem chamou.
        const comoUsuario = createClient(URL_SUPABASE, ANON, {
            global: { headers: { Authorization: autorizacao } }
        });

        const { data: { user }, error: erroUser } = await comoUsuario.auth.getUser();
        if (erroUser || !user) return responder({ erro: 'Sessão inválida.' }, 401);

        const { data: solicitante } = await comoUsuario
            .from('profissionais')
            .select('id, nome_completo, perfil, ativo')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (!solicitante || !solicitante.ativo) {
            return responder({ erro: 'Sem permissão.' }, 403);
        }

        const corpo = await req.json();
        const acao  = corpo.acao || 'criar';
        const tipo  = corpo.tipo;
        const registroId = corpo.registro_id;

        if (!['profissional', 'responsavel'].includes(tipo)) {
            return responder({ erro: 'Tipo inválido.' }, 400);
        }
        if (!registroId) return responder({ erro: 'Registro não informado.' }, 400);

        // 2. Quem pode fazer o quê
        const podeProfissional = solicitante.perfil === 'admin_direcao';
        const podeResponsavel  = ['admin_direcao', 'coordenador_aba', 'recepcao'].includes(solicitante.perfil);
        if (tipo === 'profissional' && !podeProfissional) {
            return responder({ erro: 'Somente a direção cria acesso de profissional.' }, 403);
        }
        if (tipo === 'responsavel' && !podeResponsavel) {
            return responder({ erro: 'Sem permissão para criar acesso de responsável.' }, 403);
        }

        // 3. Daqui em diante, poder total — com o alvo já validado
        const admin = createClient(URL_SUPABASE, SERVICE, { auth: { persistSession: false } });
        const tabela = tipo === 'profissional' ? 'profissionais' : 'responsaveis';
        const campoNome = tipo === 'profissional' ? 'nome_completo' : 'nome';

        const { data: registro } = await admin
            .from(tabela)
            .select(`id, email, auth_user_id, ${campoNome}`)
            .eq('id', registroId)
            .maybeSingle();

        if (!registro) return responder({ erro: 'Cadastro não encontrado.' }, 404);

        const email = String(registro.email || '').trim().toLowerCase();
        if (!email) return responder({ erro: 'Cadastro sem e-mail.' }, 400);

        async function auditar(detalhes: Record<string, unknown>) {
            await admin.from('auditoria').insert({
                profissional_id: solicitante.id,
                acao: 'status',
                tabela: tabela,
                registro_id: registroId,
                detalhes: detalhes,
                pagina: 'criar-acesso'
            });
        }

        // ── remover acesso ──────────────────────────────────────────────────
        if (acao === 'remover') {
            if (!registro.auth_user_id) return responder({ erro: 'Este cadastro não tem acesso.' }, 400);
            if (registro.auth_user_id === user.id) {
                return responder({ erro: 'Você não pode remover o próprio acesso.' }, 400);
            }
            await admin.auth.admin.deleteUser(registro.auth_user_id);
            await admin.from(tabela).update({ auth_user_id: null }).eq('id', registroId);
            await auditar({ evento: 'acesso removido', email });
            return responder({ ok: true, mensagem: 'Acesso removido.' });
        }

        // ── redefinir senha ─────────────────────────────────────────────────
        if (acao === 'redefinir') {
            if (!registro.auth_user_id) return responder({ erro: 'Este cadastro ainda não tem acesso.' }, 400);
            const nova = senhaTemporaria();
            const { error } = await admin.auth.admin.updateUserById(registro.auth_user_id, {
                password: nova,
                user_metadata: { senha_temporaria: true }
            });
            if (error) return responder({ erro: error.message }, 400);
            await auditar({ evento: 'senha redefinida', email });
            return responder({ ok: true, senha: nova, email: email });
        }

        // ── criar acesso ────────────────────────────────────────────────────
        if (registro.auth_user_id) {
            return responder({ erro: 'Este cadastro já tem acesso.' }, 400);
        }

        // o e-mail pode já existir no Auth (recontratação, ou responsável de outro filho)
        const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existente = (lista?.users || []).find(
            (u: { email?: string }) => (u.email || '').toLowerCase() === email
        );

        if (existente) {
            await admin.from(tabela).update({ auth_user_id: existente.id }).eq('id', registroId);
            await auditar({ evento: 'conta existente vinculada', email });
            return responder({
                ok: true, vinculado: true,
                mensagem: 'Já existia uma conta com este e-mail. Ela foi vinculada a este cadastro.'
            });
        }

        const senha = senhaTemporaria();
        const { data: novo, error: erroCriar } = await admin.auth.admin.createUser({
            email: email,
            password: senha,
            email_confirm: true,     // sem depender de e-mail de confirmação
            user_metadata: {
                nome: registro[campoNome],
                tipo: tipo,
                senha_temporaria: true
            }
        });

        if (erroCriar) return responder({ erro: erroCriar.message }, 400);

        await admin.from(tabela).update({ auth_user_id: novo.user.id }).eq('id', registroId);
        await auditar({ evento: 'acesso criado', email });

        return responder({ ok: true, senha: senha, email: email });

    } catch (e) {
        console.error(e);
        return responder({ erro: String(e?.message || e) }, 500);
    }
});
