# EQ ABA — Sprint 6 · fotos e auditoria acessível

## Antes de aplicar
Rodar o SQL do sprint 6: permissão da coordenação na auditoria, campo `foto_url`
em pacientes e criação do bucket `fotos` (privado) com suas políticas.

## Fotos
- Paciente: clicar no avatar na ficha e escolher a imagem
- Profissional: clicar no avatar na tela de Equipe
- Aparecem nos cards, nas listas e no rodapé do menu
- A imagem é cortada em quadrado e reduzida para 512px no próprio navegador antes
  de subir — foto de celular de 5 MB vira ~60 KB
- O bucket é **privado**. Cada exibição usa link assinado com validade de 1 hora.
  Foto de criança não fica acessível por link solto.

## Auditoria
Nova tela em **Gestão → Auditoria**, para coordenação, supervisão e direção.

- Filtro por período (últimos 7 dias por padrão), pessoa, tipo de ação e tipo de registro
- Cada linha em português: quem, o que fez, em qual registro e quando
- "Ver detalhes" abre o que exatamente mudou
- Exportar CSV — e a exportação também fica registrada

## O que passou a ser auditado neste sprint
Entrada e saída do sistema, envio de foto, criação de vínculo aplicador-paciente.

## Já era auditado
Cadastro e edição de paciente, abertura de ficha, cadastro de profissional e equipe,
ativar/desativar profissional, presença, geração de sessões, criar e encerrar horário.

## Regra permanente
Toda ação nova que gravar no banco precisa de uma linha `EqAudit.registrar(...)`.
A trilha não tem update nem delete: uma vez gravada, não muda.
