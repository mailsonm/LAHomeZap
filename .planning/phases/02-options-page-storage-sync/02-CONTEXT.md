# Phase 02: Options Page & Storage Sync - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Desenvolver a Options Page completa da extensão, denominada "Nome Personalizado", com suporte a cadastro de múltiplos atendentes, seleção do atendente ativo (favorito com estrela), e os switches de configurações globais: "Acesso rápido + atalho", "Receber alerta de Transferência", "Controle de Atendimento", "Letra inicial maiúscula", e "Não repetir no chat". Todos os dados de atendentes e opções devem ser persistidos no `chrome.storage.sync` para sincronização automática. O content script deve ser atualizado para consumir reativamente o atendente ativo como assinatura.

</domain>

<decisions>
## Implementation Decisions

### Gerenciador de Atendentes ("Nome Personalizado")
- **D-01:** A Options Page exibirá um grid de atendentes cadastrados, um botão para adicionar "Novo", e um botão de estrela para marcar qual atendente está ativo no momento (favoritado).
- **D-02:** Cada atendente será representado por um objeto com `{ id, name, isFavorite }`. Apenas um atendente pode ser marcado como favorito por vez.
- **D-03:** A lista de atendentes e o atendente favorito serão salvos em `chrome.storage.sync` sob a chave `attendants`.

### Opções Globais de Configuração
- **D-04:** Checkboxes a serem salvos em `chrome.storage.sync` sob a chave `settings`:
  - `quickAccess`: Acesso rápido + atalho (boolean, padrão `true`)
  - `transferAlert`: Receber alerta de Transferência (boolean, padrão `false`)
  - `attendanceControl`: Controle de Atendimento (boolean, padrão `true`)
  - `capitalizeInitial`: Letra inicial maiúscula (boolean, padrão `true`)
  - `dontRepeatInChat`: Não repetir no chat (boolean, padrão `false`)

### Lógica da Assinatura Reativa no Content Script
- **D-05:** O content script escutará mudanças na lista de atendentes e configurações globais. A assinatura usará o nome do atendente atualmente favoritado.
- **D-06:** Se `capitalizeInitial` estiver ativo, o nome do atendente será capitalizado (primeira letra maiúscula) na assinatura.
- **D-07:** Se `dontRepeatInChat` estiver ativo, o script verificará se já existe alguma mensagem recente assinada pelo mesmo atendente no chat ativo antes de reinserir a assinatura ao focar no input (detalhes finos de DOM-reading de mensagens serão implementados de forma resiliente, ou caso seja complexo ler mensagens antigas, podemos limitar a verificação ao conteúdo atual do input ou histórico recente em cache). Para a Phase 2, focaremos em não duplicar se o input não estiver vazio.

</decisions>

<canonical_refs>
## Canonical References

### Requisitos e Arquitetura do Projeto
- `.planning/PROJECT.md` — Contexto e diretrizes gerais.
- `.planning/REQUIREMENTS.md` §CONF-01, §CONF-02 — Requisitos de sincronização e opções da v1.
- Requisitos visuais fornecidos pelo usuário via prints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [options.css](file:///home/mailson/Documentos/GitHub/LAHomeZap/src/options/options.css) — Estilo base premium que estenderemos para acomodar a nova UI do gerenciador.
- [App.tsx](file:///home/mailson/Documentos/GitHub/LAHomeZap/src/options/App.tsx) — Estrutura de storage local/sync básica.
- [index.ts](file:///home/mailson/Documentos/GitHub/LAHomeZap/src/content/index.ts) — Cache do nome do atendente e listener de injeção.

</code_context>

---

*Phase: 02-options-page-storage-sync*
*Context gathered: 2026-06-26*
