# CORTEX aba — Sprint 19 · criar acessos sem sair do sistema

## O problema
Contratar alguém exigia abrir o painel do Supabase e criar o usuário na mão. Não dá
para pedir isso à coordenação, e não escala.

## Por que precisou de uma função no servidor
Criar conta exige a **service_role key**, que tem poder total sobre o banco — ela não
pode, em hipótese nenhuma, ficar no navegador. A solução é uma Edge Function: a chave
fica guardada como segredo no Supabase, e o navegador só manda o pedido com o próprio
token. A função confere quem está pedindo antes de fazer qualquer coisa.

Quem pode o quê:
- **profissional** → só direção
- **responsável** → direção, coordenação ou recepção

---

## PASSO OBRIGATÓRIO: publicar a função

Sem isso os botões novos avisam que a função não está publicada.

### Opção A — pelo painel (mais simples)
1. Supabase → **Edge Functions** → **Deploy a new function**
2. Nome: `criar-acesso`
3. Colar o conteúdo de `supabase/functions/criar-acesso/index.ts`
4. Deploy

### Opção B — pela linha de comando
```powershell
cd 'D:\NOVO CORTEX ABA\cortex_app_inicial\cortex_aba_app'
npx supabase login
npx supabase link --project-ref fftmhjwnuvgzdaxpzwln
npx supabase functions deploy criar-acesso
```

### Segredos
`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já vêm preenchidos
automaticamente em toda Edge Function. Não precisa configurar nada.

### Conferir
Edge Functions → criar-acesso → deve aparecer como ativa. O primeiro clique em
"Criar acesso" no sistema é o teste real.

---

## O que muda nas telas

### Equipe
- Cada profissional sem conta ganha o botão **Criar acesso**
- Quem já tem conta ganha **redefinir senha**
- No cadastro, a opção "criar o acesso agora" já vem marcada

### Ficha do paciente → Família
- Mesma coisa para o responsável, gerando o acesso ao portal

### Senha temporária
Gerada pelo sistema, sem caracteres ambíguos (nada de 0/O ou 1/l) porque alguém vai
ditar isso por telefone. Aparece **uma vez**, com botão de copiar. Não fica guardada
em lugar nenhum — se perder, é só redefinir.

### Primeiro acesso
Quem entra com senha temporária é levado direto para `trocar-senha.html` e só chega
ao sistema depois de definir a própria senha. Vale para equipe e para famílias.

Também dá para trocar a senha quando quiser, em Configurações → Meu perfil.

## Auditoria
Criar acesso, redefinir senha e remover acesso ficam registrados, com quem fez e para
quem — inclusive as ações feitas pela função no servidor.

## Arquivos
```
supabase/functions/criar-acesso/index.ts   novo — publicar no Supabase
shared/acesso.js                           novo — cliente da função
trocar-senha.html                          novo
equipe/index.html                          botões de acesso
pacientes/pasta.html                       acesso do responsável
index.html                                 desvia senha temporária
configuracoes/index.html                   trocar minha senha
```
