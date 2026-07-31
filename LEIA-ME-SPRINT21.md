# CORTEX aba — Sprint 21 · anamnese com link para a família

## Antes de aplicar
Rodar o SQL do sprint 21 (anamnese_modelos, anamneses e as duas funções de acesso público).

## Era a Fase 2 do mapa
A anamnese preenchida pela família, sem Google Forms e sem digitação manual depois.

## Como funciona
1. **Configurações → Anamnese**: cadastrar o modelo. Estrutura em texto, como nos
   protocolos: linha com `#` vira seção; `*` no começo torna a pergunta obrigatória;
   `[longo]`, `[sim/não]`, `[data]` ou `[número]` no fim definem o tipo.
2. **Ficha do paciente → Anamnese**: gerar link. Aparece pronto para copiar, com botão
   que abre o WhatsApp com a mensagem montada.
3. A família abre no celular, **sem login**, e preenche. As respostas são guardadas
   sozinhas enquanto ela digita — dá para parar no meio e voltar depois.
4. A ficha mostra o andamento: link enviado, aberto, sendo preenchido, respondido.
5. A equipe lê as respostas e marca como revisada. Aí o link para de funcionar.

## A parte de segurança
A família não tem login, mas o link não pode virar uma porta aberta.

Se déssemos permissão de leitura ao público, qualquer pessoa listaria todas as
anamneses do sistema. Em vez disso, o acesso público não toca nas tabelas: existem
apenas **duas funções**, que exigem o token e devolvem só o necessário.

Além disso:
- O link mostra apenas o **primeiro nome** da criança — ele circula por WhatsApp
- Tem **validade** configurável, 30 dias por padrão
- Depois de revisada, o link para de responder
- O token tem 28 caracteres aleatórios

## Arquivos
```
anamnese.html               novo — página pública, sem login
pacientes/pasta.html        aba Anamnese
configuracoes/index.html    aba Anamnese (modelos)
```

## Teste rápido
Cadastre um modelo, gere o link para um paciente e abra em janela anônima. Preencha
metade, feche, abra de novo pelo mesmo link: as respostas devem estar lá.
