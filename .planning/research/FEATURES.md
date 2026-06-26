# Feature Research

**Domain:** WhatsApp Web Chrome Extension for Healthcare Operations
**Researched:** 2026-06-26
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Painel Kanban Lateral | Visualizar as demandas de forma organizada diretamente na tela de trabalho. | MEDIUM | Injetado no DOM do WhatsApp Web via React Portals ou Shadow DOM. |
| Detecção de Mensagens Hapvida | Identificar novas mensagens de números cadastrados como "Hapvida" e colocá-las no Kanban automaticamente. | MEDIUM | Monitoramento do DOM via `MutationObserver` nas conversas ativas ou leitura de histórico. |
| Repasse com 1 clique | Enviar mensagens rapidamente para grupos pré-definidos sem copiar e colar ou buscar manualmente. | HIGH | Simulação de eventos de clique nativos e inserção no modal de encaminhamento do WhatsApp. |
| Menção Rápida (`@@`) | Buscar e marcar pessoas específicas da coordenação sem precisar digitar nomes inteiros. | MEDIUM | Interceptação de input e exibição de menu popover suspenso sobre a caixa de texto. |
| Tela de Configurações (Options) | Cadastrar os números do Hapvida, nomes de atendentes, favoritos por grupo e templates. | LOW | Página html de opções nativa da extensão integrada com `chrome.storage.sync`. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sincronização automática zero-servidor | Compartilha status de demandas e configurações entre atendentes sem custo de banco de dados ou backend. | HIGH | Utiliza `chrome.storage.sync` sincronizado pela conta Google corporativa do navegador. |
| Menção urgente com 1 clique | Destaca a mensagem no grupo com emojis e termos de atenção automática (`@Nome 🚨 URGENTE:`). | LOW | Inserção automática de texto formatado via cursor no input de texto. |
| `@todos` do grupo | Avisar simultaneamente toda a equipe do grupo para alterações de protocolos ou avisos cruciais. | HIGH | Obtém a lista de participantes do grupo lendo o cabeçalho/detalhes do DOM e simula menções. |
| Etiquetas de Status | Identificar visualmente na lista de conversas qual o status daquele atendimento diretamente. | MEDIUM | Badge inserida ao lado do nome do chat no DOM lateral esquerdo do WhatsApp. |
| Templates com Variáveis | Responder rápido a solicitações recorrentes parametrizando nomes, datas e horários dinamicamente. | MEDIUM | Janela popover para seleção rápida de textos pré-cadastrados com inputs para preencher variáveis. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Servidor backend próprio | Centralizar dados de forma robusta e gerar relatórios complexos. | Alto custo de manutenção, infraestrutura complexa, custos recorrentes de nuvem. | Usar `chrome.storage.sync` para sincronizar os dados levemente e de forma nativa e sem custos. |
| Integração Multi-empresa (SaaS) | Poder revender a extensão para outras empresas de home care. | Transforma ferramenta interna customizada em produto genérico, aumentando escopo e suporte. | Focar exclusivamente na dor operacional e sob medida da La Home Care. |

## Feature Dependencies

```
[Painel Kanban Lateral]
    ├── requer ──> [Detecção de Mensagens Hapvida]
    └── atualizado por ──> [Etiquetas de Status]

[Repasse com 1 clique] ── simplifica ──> [Encaminhamento nativo]

[Menção Rápida "@@"] ── prioriza ──> [Favoritos cadastrados em Configurações]
```

### Dependency Notes

- **Painel Kanban requer Detecção de Mensagens:** Sem a captura e escuta das mensagens do contato Hapvida no DOM, o painel não saberia criar novos cards automaticamente.
- **Etiquetas de Status atualizam o Kanban:** Mudar o status de uma conversa (etiqueta) deve mover o card correspondente no painel Kanban.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept and speed up operations.

- [ ] **Painel Lateral Básico** — Kanban integrado com as colunas (Novas, Em Andamento, Concluídas).
- [ ] **Detecção Automática** — Captura de mensagens de contatos cadastrados como Hapvida para povoar o Kanban.
- [ ] **Repasse com 1 clique** — Atalho para encaminhar mensagens do Hapvida para os grupos chave.
- [ ] **Menção Rápida (`@@`)** — Menu suspenso de favoritos no input de texto para os coordenadores favoritos.
- [ ] **Sincronização via Storage Sync** — Armazenamento compartilhado nativo entre os atendentes.
- [ ] **Assinatura do Atendente** — Adição automática do nome do operador no início das mensagens.

### Add After Validation (v1.x)

- [ ] **Etiquetas de Status Visuais** — Badges coloridas ao lado do nome do chat no DOM do WhatsApp.
- [ ] **Templates de Frases Prontas** — Envio rápido de respostas pré-configuradas com substituição de variáveis básicas.
- [ ] **Menção `@todos`** — Comando para mencionar todos do grupo puxando informações do DOM.

### Future Consideration (v2+)

- [ ] **Dashboard Web Externo** — Uma interface analítica externa lendo dados consolidados se houver necessidade futura de auditoria de performance da equipe.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Painel Kanban | HIGH | MEDIUM | P1 |
| Detecção Hapvida | HIGH | MEDIUM | P1 |
| Repasse Rápido | HIGH | HIGH | P1 |
| Menção Rápida (`@@`) | HIGH | MEDIUM | P1 |
| Sincronização Sync | HIGH | HIGH | P1 |
| Assinatura Atendente | MEDIUM | LOW | P1 |
| Tela de Configurações | HIGH | LOW | P1 |
| Etiquetas de Status | MEDIUM | MEDIUM | P2 |
| Templates de Frases | MEDIUM | MEDIUM | P2 |
| `@todos` no grupo | MEDIUM | HIGH | P2 |

---
*Feature research for: WhatsApp Web Chrome Extension*
*Researched: 2026-06-26*
