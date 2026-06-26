# Phase 03: Kanban Panel & Attendance Control Integration - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Injetar o Painel Kanban lateral no WhatsApp Web (através de Shadow DOM para isolamento de estilos) contendo 3 colunas (Novas, Em Andamento, Concluídas), suportando controle manual de cards. Implementar o botão flutuante de "Iniciar Atendimento / Finalizar Atendimento" no painel do chat ativo. Integrar o controle de atendimento com etiquetas do WhatsApp Business, verificando se a etiqueta do atendente ativo existe, exibindo aviso de orientação se ausente, e aplicando/removendo a etiqueta na conversa no início/fim de atendimento.

</domain>

<decisions>
## Implementation Decisions

### Injeção do Painel Kanban Lateral
- **D-01:** O painel Kanban será injetado como um elemento flexível adjacente à estrutura do WhatsApp Web, redimensionando de forma responsiva a janela de chat quando aberto.
- **D-02:** Usará Shadow DOM para garantir isolamento absoluto de estilos, impedindo que classes da extensão entrem em conflito com o CSS nativo do WhatsApp Web.
- **D-03:** Terá colunas para organizar demandas nos estados: "Novas", "Em Andamento" e "Concluídas". Terá controle de fechar/minimizar.

### Botão de Iniciar/Finalizar Atendimento
- **D-04:** O botão "Iniciar Atendimento" só será exibido se a opção `attendanceControl` estiver ativada nas configurações da extensão. Ele será injetado no topo da área do chat ativo.
- **D-05:** Ao clicar em "Iniciar Atendimento", o content script buscará o atendente favorito ativo e verificará as etiquetas do WhatsApp Business.

### Integração com Etiquetas (Labels) do WhatsApp Business
- **D-06:** Para verificar se a etiqueta do atendente (ex: `"Luan:"`) existe, o script acionará programaticamente o clique no botão nativo de etiquetas do chat ativo (seletor: `button[data-testid="menu-icon-labels"]` ou ícone de tag).
- **D-07:** O script aguardará a renderização do modal nativo de etiquetas. Se a etiqueta do atendente não estiver na lista:
  - Exibe o modal explicativo customizado (`A etiqueta "Nome:" não foi encontrada...`).
  - Ao clicar em "OK", foca no botão "Nova etiqueta" no modal nativo do WhatsApp e copia o nome do atendente (com dois pontos) para a área de transferência, facilitando a criação rápida.
- **D-08:** Se a etiqueta for encontrada na lista, o script marcará o checkbox correspondente, clicará em "Salvar" no modal do WhatsApp e atualizará o estado do botão para "Finalizar Atendimento" (com estilo vermelho).
- **D-09:** O clique em "Finalizar Atendimento" abrirá o modal de etiquetas nativo, desmarcará o checkbox do atendente ativo, salvará o modal e redefinirá o botão para "Iniciar Atendimento".

</decisions>

<canonical_refs>
## Canonical References

### Requisitos e Arquitetura do Projeto
- `.planning/PROJECT.md` — Contexto e diretrizes gerais.
- `.planning/REQUIREMENTS.md` §KANB-01, §KANB-02, §STAT-02 — Painel Kanban e Controle de Atendimento.
- Prints e referências operacionais de etiquetas enviadas pelo usuário.

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Área de chat ativo do WhatsApp Web (`div[data-testid="conversation-panel-body"]` e cabeçalho de controle).
- Botões de ação do chat (ícone de etiqueta nativo do WhatsApp Business).
- Container raiz flex do WhatsApp Web para injeção da terceira coluna (Kanban).

</code_context>

---

*Phase: 03-kanban-panel-attendance-control*
*Context gathered: 2026-06-26*
