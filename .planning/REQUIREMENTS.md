# Requirements: La Home Zap

**Defined:** 2026-06-26
**Core Value:** Agilizar o repasse de demandas do Hapvida para os prestadores/equipe internos diretamente no WhatsApp Web, eliminando tarefas repetitivas e garantindo rastreabilidade do atendimento.

## v1 Requirements

### Kanban & Demandas (KANB)

- [ ] **KANB-01**: Painel lateral Kanban (Novas, Em Andamento, Concluídas) injetado responsivamente no WhatsApp Web, permitindo minimizar/maximizar para não sobrepor a conversa ativa.
- [ ] **KANB-02**: Criação e movimentação manual de cards de demandas no painel lateral Kanban para organizar o fluxo de atendimento.

### Repasse Rápido (FORW)

- [ ] **FORW-01**: Exibição de um modal de atalhos rápidos com grupos e prestadores favoritos/mais usados configurados pela coordenação.

### Menção Rápida (MENT)

- [ ] **MENT-01**: Menu de menção rápida exibido como popover suspenso ao digitar o gatilho `@@` na caixa de texto do WhatsApp Web.

### Status & Assinaturas (STAT)

- [x] **STAT-01**: Inserção automática do nome personalizado do atendente configurado, em negrito e no topo da mensagem enviada, para identificar quem conversou com a pessoa (ex: `*Atendente: [Nome]*\n`).
- [ ] **STAT-02**: Botão "Iniciar Atendimento / Finalizar Atendimento" integrado ao cabeçalho do chat, gerenciando etiquetas do WhatsApp Business. Verifica a presença da etiqueta do atendente ativo (ex: `"Luan:"`), exibe modal instrutivo em caso de ausência e auxilia o redirecionamento para criação.

### Configurações & Sincronização (CONF)

- [ ] **CONF-01**: Página de Opções ("Nome Personalizado") para cadastrar múltiplos atendentes, definir o atendente ativo (estrela), gerenciar grupos favoritos e configurar opções de comportamento (Acesso rápido, Alerta de Transferência, Letra maiúscula, Não repetir, Controle de Atendimento).
- [ ] **CONF-02**: Sincronização de configurações (atendentes, checkboxes globais e status de demandas ativas) de forma transparente entre atendentes via `chrome.storage.sync` (usando conta organizacional Google).
- [ ] **CONF-03**: Mecanismo automático de limpeza (pruning) de demandas concluídas com mais de 24 horas no Kanban para respeitar o limite de 100KB do `chrome.storage.sync`.

---

## v2 Requirements

### Kanban & Demandas Automatizadas

- **KANB-03**: Detecção automática de mensagens recebidas de contatos configurados como Hapvida no DOM do WhatsApp Web.
- **KANB-04**: Criação automática de cards no Kanban a partir de mensagens detectadas da Hapvida.
- **KANB-05**: Atribuição visual de responsável direto ("Atribuir a mim" / "Atribuir a...") no card da demanda no Kanban.

### Repasse Automatizado

- **FORW-02**: Botão "Repassar" de 1 clique inserido diretamente ao lado das mensagens do Hapvida.
- **FORW-03**: Execução automática do envio simulando ações do modal nativo do WhatsApp Web após escolha do grupo.

### Menções e Contatos

- **MENT-02**: Exibição prioritária de contatos favoritos configurados especificamente para o grupo aberto no menu `@@`.
- **MENT-03**: Atalho rápido para marcação urgente com formatação automática (`@Nome 🚨 URGENTE:`).
- **MENT-04**: Menção automática em lote (`@todos` do grupo) extraindo os membros do grupo visíveis no DOM.

### Badges e Respostas Rápidas

- **STAT-03**: Templates de frases padrão da empresa com preenchimento dinâmico de variáveis (`{{nome}}`, `{{prestador}}`, `{{data}}`) via interface popover.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Plataforma SaaS multi-tenant comercial | O sistema é de uso exclusivo interno da La Home Care. |
| Servidor backend próprio (Banco de Dados SQL) | Custo zero de infraestrutura e complexidade desnecessária para apenas 4-10 usuários locais. Sincronização resolvida nativamente via Chrome Sync. |
| Relatórios analíticos e BI avançados | Foco exclusivamente operacional nas dores diárias de atendimento e repasse. |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| KANB-01 | Phase 3 | Pending |
| KANB-02 | Phase 3 | Pending |
| FORW-01 | Phase 4 | Pending |
| MENT-01 | Phase 5 | Pending |
| STAT-01 | Phase 1 | Completed |
| STAT-02 | Phase 3 | Pending |
| CONF-01 | Phase 2 | Pending |
| CONF-02 | Phase 2 | Pending |
| CONF-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-26*
*Last updated: 2026-06-26 after adding attendance control and attendant manager*
