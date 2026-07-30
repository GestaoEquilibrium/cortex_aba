# EQ ABA — Sprint 3 · pacientes, auditoria e identidade visual

## Antes de aplicar
Rodar no SQL Editor o bloco do Sprint 3 (tabela `auditoria` + campos de quem/quando
em `sessoes` + trigger de carimbo).

## O que entra
- **Cards de paciente com indicadores**: próxima sessão, frequência, dias desde a última
  evolução, faltas no mês, cartão de segurança, convênio e status
- **Busca** por nome do paciente e do responsável
- **Filtros**: ativos, meus pacientes, com faltas, fila de espera
- **Alternador cards/lista** — aplicador entra já filtrado nos pacientes dele
- **Auditoria** (`shared/audit.js`) ligada em: cadastro de paciente, cadastro de
  profissional e equipe, ativar/desativar profissional, lançamento de presença e
  geração de sessões
- **Favicon e ícones** no verde-navy, mesmo desenho do CORTEX; portal do responsável
  em roxo, com manifesto próprio (instala no celular como app separado)

## Arquivos
```
favicon.svg .ico -16 -32 -48 .png       ícones da equipe (navy → verde)
apple-touch-icon.png icon-192 icon-512
site.webmanifest
portal/favicon.svg + ícones + manifest.json   variante roxa (tema espectro)
shared/audit.js                         EqAudit.registrar(...)
pacientes/lista.html                    cards + lista + busca + filtros
index.html dashboard.html agenda/ equipe/ portal/ sessao/   só tags de ícone + audit.js
```

## Regra da auditoria
Log nunca derruba operação: se a gravação falhar, cai no console e a ação do usuário
segue. Perder um log é ruim; impedir o aplicador de lançar a sessão é pior.

## Próximo sprint
Agenda com as três visões (dia, semana por profissional, mês de ocupação), filtro por
profissional e montagem da grade pela tela. Depois, a pasta do paciente.
