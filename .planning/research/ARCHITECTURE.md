# Architecture Research

**Domain:** WhatsApp Web Chrome Extension
**Researched:** 2026-06-26
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Popup / Options UI                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐     ┌───────────────────────┐  │
│  │       Popup Page        │     │  Options Settings UI  │  │
│  └────────────┬────────────┘     └───────────┬───────────┘  │
│               │                              │              │
├───────────────┼──────────────────────────────┼──────────────┤
│               │    chrome.storage.sync API   │              │
├───────────────┼──────────────┬───────────────┼──────────────┤
│               │              │               │              │
│               ▼              ▼               ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              chrome.storage.sync (Shared)             │  │
│  │  - Lista de prestadores, favoritos, frases prontas   │  │
│  │  - Status de demandas ativas (limite total 100KB)    │  │
│  └───────────────────────────▲───────────────────────────┘  │
│                              │                              │
├──────────────────────────────┼──────────────────────────────┤
│                   DOM Events / MutationObserver             │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              │    Content Script (WhatsApp)  │              │
│              │  ┌─────────────────────────┐  │              │
│              │  │  React Kanban Panel UI  │  │              │
│              │  └─────────────────────────┘  │              │
│              │  ┌─────────────────────────┐  │              │
│              │  │  React Mention Menu UI  │  │              │
│              │  └─────────────────────────┘  │              │
│              │  ┌─────────────────────────┐  │              │
│              │  │  DOM Selection & Input  │  │              │
│              │  └─────────────────────────┘  │              │
│              └───────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Content Script | Injetar componentes React na página, observar o DOM para capturar novas mensagens e manipular o input de mensagem. | Arquivo TypeScript compilado que é executado no escopo de `web.whatsapp.com`. |
| DOM Observer | Escutar mudanças no DOM usando `MutationObserver` para capturar a chegada de novas mensagens do Hapvida e renderizar badges. | Módulo TypeScript especializado com callbacks otimizados. |
| React UI (Kanban/Mention) | Renderizar componentes ricos integrados visualmente com a estética do WhatsApp Web. | Injeção via React 18 Root em containers Shadow DOM para evitar conflitos de estilo. |
| Options Page | Interface de configuração completa onde o usuário insere os telefones cadastrados, favoritos de menção e frases prontas. | Página HTML nativa que roda em aba separada do Chrome (`options.html`). |
| Storage Provider | Interface limpa para leitura e escrita em `chrome.storage.sync` com tratamento de concorrência simples. | Wrapper TypeScript com tratamento de cotas e parse de dados. |

## Recommended Project Structure

```
src/
├── background/
│   └── service-worker.ts      # Gerencia alarmes, notificações e atalhos se necessário
├── content/
│   ├── index.ts               # Ponto de entrada do script injetado
│   ├── observer.ts            # Gerencia MutationObservers (mensagens e conversas)
│   ├── dom-selectors.ts       # Centraliza seletores de classes do WhatsApp Web
│   └── injector.ts            # Auxiliar para injetar React roots e estilos Shadow DOM
├── features/
│   ├── hapvidaPanel/          # Mini-Kanban de demandas
│   ├── quickForward/          # Lógica de encaminhamento rápido (repassar)
│   ├── mentionPicker/         # Lógica de "@@", favoritos e "@todos"
│   ├── statusTags/            # Inserção de badges de status na lista de chats
│   └── quickReplies/          # Frases padrão e identificação do atendente
├── components/
│   ├── KanbanPanel/           # Componente React para painel lateral de Kanban
│   ├── MentionMenu/           # Componente React popover para menções rápidas
│   └── ui/                    # Botões, badges e inputs estilizados
├── options/
│   ├── index.html             # HTML da página de opções
│   └── Options.tsx            # UI React da página de opções
├── popup/
│   ├── index.html             # HTML do popup rápido
│   └── Popup.tsx              # UI React do popup rápido
└── lib/
    ├── storage.ts             # Wrapper para chrome.storage API
    └── events.ts              # Pub/Sub interno entre componentes do content script
```

### Structure Rationale

- **content/**: Isola a lógica que interage diretamente com a página do WhatsApp Web. Manter os seletores do DOM separados em `dom-selectors.ts` permite atualizações rápidas quando o WhatsApp mudar o layout, sem mexer na lógica de negócios da extensão.
- **features/**: Agrupamento focado em domínios de funcionalidades individuais. Facilita o desenvolvimento modular e paralelo por planos.
- **Shadow DOM injection (injector.ts)**: Componentes React injetados no DOM do WhatsApp devem ser empacotados dentro de um Shadow Root. Isso isola o CSS de terceiros (como nossos botões do Kanban) e impede que o CSS nativo do WhatsApp quebre o layout da extensão (e vice-versa).

## Architectural Patterns

### Pattern 1: DOM Selectors Isolation

**What:** Centralizar todos os seletores XPath e CSS em um único arquivo de configuração de seletores (`dom-selectors.ts`).
**When to use:** Essencial para qualquer extensão de raspagem ou injeção de DOM em sites de terceiros que mudam com frequência.
**Trade-offs:** Exige disciplina para nunca usar strings de seletores em linha nos componentes.

**Example:**
```typescript
// src/content/dom-selectors.ts
export const SELECTORS = {
  chatListContainer: '[data-testid="chat-list"]',
  messageInput: 'div[contenteditable="true"][data-tab="10"]',
  messageRow: '[data-testid="msg-container"]',
  chatHeader: '[data-testid="conversation-header"]',
  activeChatTitle: '[data-testid="conversation-header"] span[title]',
};
```

### Pattern 2: Shadow DOM React Root Injection

**What:** Criar um elemento container no DOM do WhatsApp, anexar um Shadow Root e renderizar a raiz do React dentro dele.
**When to use:** Ao injetar o painel lateral de Kanban ou o popover de menção rápida na página.
**Trade-offs:** Estilos de fontes globais devem ser copiados explicitamente para dentro do Shadow Root.

**Example:**
```typescript
// src/content/injector.ts
export function injectReactComponent(
  targetElement: HTMLElement,
  component: React.ReactNode,
  id: string
) {
  const container = document.createElement('div');
  container.id = id;
  targetElement.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  // Injetar estilos CSS específicos dentro do shadow root
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles/injected.css');
  shadow.appendChild(styleLink);

  const root = createRoot(mountPoint);
  root.render(component);
}
```

## Data Flow

### State & Storage Flow

```
[UI Actions (Kanban/Chat)]
     │
     ▼ (Salva estado localmente)
[chrome.storage.sync]
     │
     ▼ (Notifica via onChanged)
[Outras Abas / Componentes da Extensão]
     │
     ▼ (Atualiza UI instantaneamente)
[React Rerender]
```

### Key Data Flows

1. **Chegada de mensagem do Hapvida:**
   - `MutationObserver` detecta nova mensagem em `web.whatsapp.com`.
   - Lê o remetente usando os seletores DOM.
   - Se o remetente bater com os números de telefones do Hapvida cadastrados no `storage`, extrai o texto da mensagem.
   - Cria uma nova demanda com status `Novas` e insere no `chrome.storage.sync`.
   - Componente do Kanban React (que escuta mudanças no `storage`) renderiza a nova demanda no painel.

2. **Repasse rápido de demanda:**
   - Usuário clica no botão "Repassar" injetado no card da demanda ou ao lado da mensagem.
   - A extensão abre a lista rápida de grupos salvos.
   - Ao selecionar o grupo "Supervisão Multi", a extensão simula o clique no botão nativo de "Encaminhar", digita o nome do grupo no campo de busca do WhatsApp Web, seleciona o primeiro item e confirma o envio.

## Scaling Considerations

Como a extensão é para **4-10 atendentes** no escritório da La Home Care, não há gargalo de servidores.
O único gargalo potencial é o **tamanho total de armazenamento do chrome.storage.sync (100KB)**.

### Gargalos do Storage

- **100KB de Limite**: Cada demanda do Kanban salva no storage consome alguns bytes. Se salvarmos o histórico de todas as demandas, atingiremos os 100KB em poucas semanas.
- **Mitigação**: O Kanban deve mostrar apenas demandas ativas e do dia corrente. Demandas concluídas há mais de 24 horas devem ser removidas automaticamente do `chrome.storage.sync` (ou limpas via alarme de background diário).

## Anti-Patterns

### Anti-Pattern: Pooling com setInterval para buscar novos elementos
**What people do:** Rodar um loop com `setInterval` de 100ms buscando elementos na tela.
**Why it's wrong:** Reduz severamente a performance do navegador, aumenta uso de CPU do atendente e pode fazer o WhatsApp Web travar.
**Do this instead:** Utilizar `MutationObserver` escutando apenas nós raiz específicos (como o container da lista de chat ou da conversa aberta) e desconectar o observer quando não for necessário.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| WhatsApp Web DOM | Manipulação direta de elementos via injeção de scripts (Content Script). | Altamente frágil e sujeito a quebras quando a Meta atualiza o layout. Seletores devem ser centralizados. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Content Script ↔ Options Page | `chrome.storage.sync` | Compartilham o mesmo storage de forma assíncrona. Mudanças feitas na tela de opções são refletidas instantaneamente nos scripts rodando nas abas do WhatsApp. |

---
*Architecture research for: WhatsApp Web Chrome Extension*
*Researched: 2026-06-26*
