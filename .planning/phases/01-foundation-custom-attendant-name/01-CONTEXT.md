# Phase 01: Foundation & Custom Attendant Name - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Configurar o esqueleto e ambiente inicial da extensão Chrome Manifest V3 usando Vite + React + TypeScript, estabelecer o arquivo de seletores centralizados do DOM do WhatsApp Web, e implementar a funcionalidade de assinatura do atendente, inserindo automaticamente o nome configurado em negrito no topo da mensagem.

</domain>

<decisions>
## Implementation Decisions

### Método de inserção do nome do atendente
- **D-01:** O nome personalizado do atendente deve ser injetado diretamente na caixa de texto do WhatsApp Web (input `div[contenteditable="true"]`).
- **D-02:** A inserção ocorre automaticamente assim que a caixa de texto recebe o foco ou o atendente começa a digitar, permitindo que ele veja e possa editar ou apagar a assinatura se necessário.
- **D-03:** O formato visual deve ser o nome configurado em negrito nativo do WhatsApp no topo da mensagem (ex: `*Atendente: Nome*\n\n`).
- **D-04:** Como a Options Page será desenvolvida na Phase 2, o nome inicial do atendente será carregado a partir de uma configuração padrão ("Coordenação") ou localstorage/variável estática no código da extensão para testes na Phase 1.

### the agent's Discretion
- Escolha da estrutura interna de empacotamento de arquivos Vite/React no boilerplate.
- Lógica exata do listener de focus/input no DOM do WhatsApp Web.
- Tratamento de quebras de linha e concatenação do texto do atendente.

</decisions>

<specifics>
## Specific Ideas

- O usuário citou como referência de fluxo de assinatura o vídeo demonstrativo em: https://youtu.be/exlWzf-Y4O4?si=k-4RRzYbofwJJB2a

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e Arquitetura do Projeto
- `.planning/PROJECT.md` — Contexto do projeto, restrições gerais e stack do La Home Zap.
- `.planning/REQUIREMENTS.md` §STAT-01 — Requisito de assinatura do atendente v1.
- `.planning/research/SUMMARY.md` — Sumário de pesquisa e caminhos do roadmap.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- N/A — Greenfield project.

### Established Patterns
- N/A — Greenfield project.

### Integration Points
- Caixa de entrada do WhatsApp Web (input focado gerenciado por React).

</code_context>

<deferred>
## Deferred Ideas

- Página de Opções (Options Page) para configuração visual e fácil do nome do atendente — Phase 2.
- Sincronização automática via `chrome.storage.sync` — Phase 2.

</deferred>

---

*Phase: 01-foundation-custom-attendant-name*
*Context gathered: 2026-06-26*
