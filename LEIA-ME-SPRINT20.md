# CORTEX aba — Sprint 20 · documentos e termos de consentimento

## Antes de aplicar
Rodar o SQL do sprint 20 (documentos_paciente, termos_modelos, termos_assinaturas e
o bucket privado `documentos`).

## Documentos — ficha do paciente, aba Documentos
Anexar laudo, encaminhamento, guia, relatório escolar, exame ou receita. PDF ou imagem,
até 15 MB.

- Cada documento pode ter **validade** — guia e autorização costumam ter
- Vencidos aparecem em vermelho; um aviso no topo mostra quantos vencem em 30 dias
- Abrir gera um link temporário de 5 minutos e fica registrado na auditoria
- Excluir pede confirmação e registra quem excluiu

O arquivo **não é reduzido**, ao contrário da foto: laudo precisa manter a qualidade
para leitura.

## Termos — Configurações → Termos (direção)
Cadastrar os termos que a clínica usa: LGPD, uso de imagem, consentimento de
intervenção, financeiro.

**Versionamento:** publicar nova versão desativa a anterior automaticamente e as
famílias passam a ver a pendência da nova. As assinaturas antigas continuam válidas
e guardadas.

## Assinatura no portal
A família lê o texto completo, marca a caixa de concordância e assina. O botão só
libera depois de marcar.

**O detalhe que importa juridicamente:** cada assinatura guarda o **texto exato** que
foi aceito, junto com a versão e a data. Se o termo mudar daqui a um ano, a assinatura
antiga continua provando o que aquela família leu de fato — e não o texto atual.

Assinatura não pode ser editada nem apagada. É prova.

## Assinatura presencial
Na ficha do paciente, aba Documentos, dá para registrar que o responsável assinou em
papel. Fica marcado como "presencial", com quem registrou.

## Arquivos
```
shared/documentos.js        novo
pacientes/pasta.html        aba Documentos + status dos termos
configuracoes/index.html    aba Termos
portal/index.html           leitura e assinatura
```
