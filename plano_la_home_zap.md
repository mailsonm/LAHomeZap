# Plano de Desenvolvimento — La Home Zap
### Extensão Chrome sob medida para La Home Care
> Solução interna e exclusiva — não é um produto para venda a terceiros
> Versão 1.0 | Junho 2026

---

## 1. Contexto e Problema a Resolver

A **La Home Care** atende pacientes através de demandas recebidas do **Hapvida**, repassando para a equipe interna (coordenação, supervisão) que por sua vez aciona os **prestadores** (técnicos de enfermagem, fisioterapeutas, cuidadores) que efetivamente atendem o paciente em domicílio.

### Fluxo atual observado (com base no sistema usado hoje — Manyzap)

```
Hapvida (operadora)
      │
      │ envia demanda/solicitação
      ▼
Equipe Interna La Home Care
  (Coordenação / Supervisão DD / Supervisão ID / Supervisão Multi)
      │
      │ precisa repassar rapidamente
      ▼
Grupos de WhatsApp por especialidade/região
  (ex: "Supervisão Equipe Multidisciplinar", "Captação Lar Home Care")
      │
      │ aciona o prestador certo
      ▼
Prestador (Técnico de Enfermagem, Fisioterapeuta, Cuidador)
      │
      │ atende
      ▼
Paciente
```

### Problemas identificados pelo cliente (via áudio)
1. **Lentidão para repassar demandas** do Hapvida para a pessoa certa internamente
2. **Dificuldade de atualizar a equipe** sobre status de atendimentos em andamento
3. **Falta de agilidade na comunicação em grupos** — direção e supervisão precisam falar diretamente com pessoas específicas dentro dos grupos sem se perder no fluxo de mensagens
4. Necessidade de **encaminhar mensagens** rapidamente entre conversas/grupos sem reescrever tudo
5. Necessidade de **marcar (@mencionar) pessoas específicas em grupo** para garantir que a demanda não seja perdida no meio de várias conversas

### Por que uma extensão (e não um sistema completo)
- Equipe pequena (**4 a 10 atendentes**), todos operando do mesmo escritório/setor
- Não há necessidade de uma plataforma robusta com servidor, multi-empresa, financeiro, etc — isso é **complexidade desnecessária e custo de manutenção contínuo** para um caso de uso interno
- A extensão resolve o problema **direto na ferramenta que a equipe já usa todo dia** (WhatsApp Web/Business), sem treinamento longo
- Sem mensalidade de SaaS de terceiros (Manyzap, ZapMe, etc) — **ferramenta própria, sob controle total da La Home Care**

---

## 2. Objetivo do La Home Zap

Criar uma extensão Chrome **exclusiva da La Home Care**, instalada nos computadores da equipe de coordenação/supervisão, que:

1. Agiliza o **repasse de demandas** do Hapvida para a pessoa/grupo certo
2. Permite **marcar (@mencionar)** pessoas específicas dentro dos grupos de coordenação com mais eficiência que o WhatsApp nativo
3. Permite **encaminhar mensagens** rapidamente entre conversas (ex: copiar solicitação do Hapvida e mandar pro grupo do prestador certo)
4. Dá **visibilidade interna** de quem está cuidando de qual demanda (evitar retrabalho ou demanda esquecida)
5. Roda **inteiramente no navegador**, sem servidor, sem mensalidade externa

---

## 3. Arquitetura — 100% Local, Sem Servidor

```
┌──────────────────────────────────────────────┐
│         Computador de cada atendente           │
│        (Coordenação / Supervisão)              │
│                                                  │
│  ┌────────────────────────────────────────┐   │
│  │     web.whatsapp.com (ou Business)      │   │
│  │  ┌────────────────────────────────┐     │   │
│  │  │   La Home Zap (Content Script) │     │   │
│  │  │  - Painel de demandas           │     │   │
│  │  │  - Menção rápida em grupos      │     │   │
│  │  │  - Encaminhar com 1 clique      │     │   │
│  │  │  - Etiquetas de status          │     │   │
│  │  └──────────────┬─────────────────┘     │   │
│  └─────────────────┼───────────────────────┘   │
│                     │                            │
│  ┌──────────────────▼────────────────────────┐  │
│  │   chrome.storage.sync (conta Google)       │  │
│  │   - Lista de prestadores por grupo         │  │
│  │   - Frases padrão (templates Hapvida)      │  │
│  │   - Status de demandas em andamento        │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Importante:** como toda a equipe (4-10 pessoas) provavelmente está no mesmo setor/escritório, o uso de **`chrome.storage.sync`** vinculado a uma conta Google Workspace da empresa (se existir) já resolve boa parte da sincronização entre os atendentes, **sem precisar de servidor próprio**.

> Se a La Home Care não usa Google Workspace corporativo, a alternativa é uma **planilha Google Sheets compartilhada** como "banco de dados" leve (a extensão lê/escreve nela via API do Google Sheets) — ainda sem precisar manter um servidor backend tradicional. Avaliamos isso na seção 9.

---

## 4. Funcionalidades do La Home Zap

### 4.1 Painel de Demandas Hapvida (funcionalidade central)

Um painel injetado na lateral do WhatsApp Web que funciona como um **mini-kanban** de demandas recebidas:

```
┌─────────────────────────────────┐
│  📋 Demandas Hapvida              │
├─────────────────────────────────┤
│  🔴 Novas (3)                     │
│   • Olgalina Andrade - Enf.       │
│   • Eusébio - Orçamento           │
│                                    │
│  🟡 Em Andamento (5)               │
│   • Tawana - Fisio Serrana        │
│     → Raiane (Supervisão Multi)   │
│                                    │
│  🟢 Concluídas Hoje (12)           │
└─────────────────────────────────┘
```

- Ao receber uma mensagem do número/contato configurado como **Hapvida**, a extensão detecta automaticamente e cria um card na coluna "Novas"
- Atendente marca quem está cuidando (`Atribuir a mim` / `Atribuir a...`)
- Card muda de coluna conforme status

```typescript
// features/hapvidaPanel/detector.ts
const HAPVIDA_CONTACT_IDS = ['5567XXXXXXXX@c.us']; // configurável nas opções

function detectHapvidaMessage(messageElement: HTMLElement, senderId: string) {
  if (HAPVIDA_CONTACT_IDS.includes(senderId)) {
    const demand = extractDemandInfo(messageElement);
    createDemandCard(demand); // adiciona ao painel
    notifyTeam(demand); // notificação para todos os atendentes
  }
}
```

### 4.2 Encaminhar com 1 Clique (Repasse Rápido)

Botão "Repassar" em cada mensagem do Hapvida que abre uma lista **pré-configurada** dos grupos/prestadores mais usados (não precisa digitar e buscar manualmente):

```
┌──────────────────────────────────┐
│  Repassar para...                  │
├──────────────────────────────────┤
│  ⭐ Mais usados                    │
│   • Supervisão Multi               │
│   • Coordenação                    │
│   • Captação Lar Home Care         │
├──────────────────────────────────┤
│  📁 Por especialidade               │
│   • Enfermagem                     │
│   • Fisioterapia                   │
│   • Cuidadores                     │
└──────────────────────────────────┘
```

Técnica: simula o clique no botão "Encaminhar" nativo do WhatsApp e preenche automaticamente a busca do modal nativo — sem violar nenhuma regra, só automatiza a UI.

```typescript
// features/quickForward/index.tsx
async function quickForward(messageEl: HTMLElement, targetGroupName: string) {
  const forwardBtn = messageEl.querySelector(SELECTORS.forwardIcon);
  simulateClick(forwardBtn);
  await waitForElement(SELECTORS.forwardModal);
  await typeIntoNativeInput(SELECTORS.forwardSearchInput, targetGroupName);
  await waitForElement(SELECTORS.forwardResultItem);
  simulateClick(SELECTORS.forwardResultItem);
  simulateClick(SELECTORS.forwardConfirmButton);
}
```

### 4.3 Menção Rápida em Grupos (@mencionar)

Esse é o ponto mais sensível pedido pelo cliente. Funcionalidades:

| Recurso | Descrição |
|---------|-----------|
| **Atalho de menção** | Digite `@@` (duplo) para abrir lista de favoritos do grupo, sem precisar digitar o nome todo |
| **Menção "Urgente"** | Botão que insere `@Pessoa 🚨 URGENTE:` automaticamente para destacar prioridade |
| **@todos do grupo** | Um clique menciona todos os participantes (para avisos gerais, ex: "mudança de protocolo Hapvida") |
| **Notificação de menção recebida** | Toast/alerta visual quando alguém te menciona em qualquer grupo, mesmo em aba não focada |
| **Favoritos por grupo** | Cada grupo guarda os 3-5 nomes mais mencionados (ex: no grupo "Supervisão Multi", sempre aparecem primeiro Raiane, Thalya, Marley) |

```typescript
// features/mentionPicker/index.tsx
function setupQuickMention(groupId: string) {
  const input = document.querySelector(SELECTORS.messageInput);

  input.addEventListener('keydown', async (e) => {
    if (e.key === '@' && lastKeyWasAt(input)) { // detecta "@@"
      e.preventDefault();
      const favorites = await getFavoriteMentions(groupId);
      showMentionPicker(favorites, input);
    }
  });
}

async function mentionAllInGroup(groupId: string, input: HTMLElement) {
  const members = await getGroupMembersFromDOM(groupId);
  for (const member of members) {
    await triggerNativeMention(input, member.name);
  }
}

function markAsUrgent(input: HTMLElement, mentionedName: string) {
  insertTextAtCursor(input, `@${mentionedName} 🚨 URGENTE: `);
}
```

### 4.4 Etiquetas de Status (Atendimento)

Pequenas etiquetas coloridas nas conversas/grupos, refletindo o fluxo real da empresa:

| Etiqueta | Cor | Significado |
|----------|-----|-------------|
| 🔵 Aguardando Hapvida | Azul | Esperando retorno da operadora |
| 🟡 Em Triagem | Amarelo | Coordenação decidindo prestador |
| 🟢 Atribuído | Verde | Prestador já está ciente |
| ✅ Atendido | Cinza | Caso encerrado |

```typescript
// features/statusTags/index.tsx
function applyStatusTag(chatId: string, status: StatusTag) {
  chrome.storage.sync.set({ [`status_${chatId}`]: status });
  renderTagBadge(chatId, status);
}
```

### 4.5 Frases Padrão (Templates da Empresa)

Respostas pré-prontas específicas do fluxo da La Home Care, configuráveis pela direção:

```
• "Recebemos sua solicitação, [NOME], já estamos providenciando o prestador."
• "Prestador [NOME_PRESTADOR] está confirmado para atendimento em [DATA]."
• "Por favor, encaminhar documentação atualizada do paciente."
• "Aguardando autorização do Hapvida para seguir com o atendimento."
```

```typescript
// features/quickReplies/index.tsx
const templates = await storage.get('laHomeTemplates');
// Inserção com substituição de variáveis {{nome}}, {{prestador}}, {{data}}
function insertTemplate(template: string, vars: Record<string, string>) {
  const filled = template.replace(/{{(\w+)}}/g, (_, key) => vars[key] || '');
  insertTextAtCursor(messageInput, filled);
}
```

### 4.6 Nome do Atendente Automático

Identifica qual atendente da coordenação está respondendo (útil para o Hapvida e prestadores saberem quem fala):

```typescript
insertTextAtStart(input, `*${agentName} - La Home Care*\n`);
```

---

## 5. Estrutura de Pastas do Projeto

```
la-home-zap/
├── manifest.json
├── public/icons/
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── index.ts
│   │   ├── observer.ts
│   │   ├── dom-selectors.ts
│   │   └── injector.ts
│   ├── features/
│   │   ├── hapvidaPanel/         # Painel de demandas (kanban)
│   │   ├── quickForward/          # Repassar com 1 clique
│   │   ├── mentionPicker/         # Menção rápida + @todos + urgente
│   │   ├── statusTags/            # Etiquetas de status
│   │   ├── quickReplies/          # Frases padrão La Home Care
│   │   └── agentName/             # Nome do atendente
│   ├── components/
│   │   ├── KanbanPanel/
│   │   ├── MentionMenu/
│   │   └── ui/
│   ├── popup/Popup.tsx
│   ├── options/
│   │   └── Options.tsx            # Configuração de grupos, templates, contato Hapvida
│   └── lib/
│       ├── storage.ts
│       └── events.ts
├── package.json
└── vite.config.ts
```

---

## 6. Manifest V3

```json
{
  "manifest_version": 3,
  "name": "La Home Zap",
  "version": "1.0.0",
  "description": "Ferramenta interna La Home Care para agilizar atendimento via WhatsApp.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": ["storage", "notifications", "alarms"],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "https://business.whatsapp.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*", "https://business.whatsapp.com/*"],
      "js": ["content/index.js"],
      "css": ["styles/injected.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html"
  },
  "options_page": "options/options.html"
}
```

Como é uso **interno e privado** (não vai para a Chrome Web Store pública), pode ser instalada via:
- **Modo desenvolvedor** (`chrome://extensions` → carregar sem pacote) — mais simples, sem custo
- Ou publicação **"não listada/privada"** na Chrome Web Store (visível só por link direto) — recomendado se quiser atualização automática para todos os 4-10 computadores sem reinstalar manualmente

> **Recomendação:** publicar como extensão **privada/não listada** na Chrome Web Store. Custo único de US$5 (taxa de desenvolvedor Google), e garante que toda vez que você atualizar o código, todos os computadores da equipe recebem a atualização automaticamente — sem precisar visitar cada máquina.

---

## 7. Configuração Inicial (Tela de Opções)

A direção/coordenação configura uma única vez:

```
┌─────────────────────────────────────────────┐
│  ⚙️ Configurações La Home Zap                  │
├─────────────────────────────────────────────┤
│  📞 Número(s) do Hapvida                       │
│  [+ 55 67 XXXX-XXXX]  [+ Adicionar outro]      │
│                                                  │
│  👥 Grupos de Coordenação                       │
│  [Supervisão Multi ▾] [Coordenação ▾]          │
│  [Captação Lar Home Care ▾] [+ Adicionar]      │
│                                                  │
│  ⭐ Favoritos por grupo (menção rápida)         │
│  Supervisão Multi: Raiane, Thalya, Marley       │
│  Coordenação: Marley, Thalya                    │
│                                                  │
│  💬 Templates de Resposta                        │
│  [Gerenciar frases padrão →]                     │
│                                                  │
│  👤 Atendentes da equipe                          │
│  [Lista de nomes para identificação]             │
└─────────────────────────────────────────────┘
```

---

## 8. Roadmap de Desenvolvimento

### Fase 1 — Base + Funcionalidades Críticas (3 semanas)
| Semana | Entrega |
|--------|---------|
| 1 | Setup do projeto (Vite + CRXJS + React), manifest, content script, DOM selectors do WhatsApp Web |
| 2 | Painel de Demandas Hapvida (detecção + kanban básico) |
| 3 | Repassar com 1 clique (encaminhar automatizado) |

### Fase 2 — Menção e Comunicação Interna (2 semanas)
| Semana | Entrega |
|--------|---------|
| 4 | Menção rápida (`@@`, favoritos por grupo, marcação de urgente) |
| 5 | `@todos` do grupo + notificação visual de menção recebida |

### Fase 3 — Organização e Templates (2 semanas)
| Semana | Entrega |
|--------|---------|
| 6 | Etiquetas de status (kanban de atendimento) |
| 7 | Frases padrão / templates com variáveis + Nome do atendente |

### Fase 4 — Configuração, Testes e Entrega (2 semanas)
| Semana | Entrega |
|--------|---------|
| 8 | Tela de Configurações (Options) completa |
| 9 | Testes com a equipe real da La Home Care, ajustes finos, treinamento rápido (15-30 min) e entrega |

**Total estimado: ~9 semanas (~2 a 2,5 meses)**

---

## 9. Sobre Sincronização Entre os 4-10 Atendentes

Como combinado, sem servidor próprio, existem 2 caminhos. Recomendo decidir isso com a direção antes de começar:

| Opção | Como funciona | Esforço extra | Limitação |
|-------|---------------|----------------|-----------|
| **A) chrome.storage.sync** | Sincroniza automaticamente se todos os atendentes usarem contas Google da mesma organização (Google Workspace) logadas no Chrome | Nenhum — já incluso no plano acima | Se não houver Workspace corporativo, cada atendente fica com sua própria conta pessoal e os dados **não sincronizam** entre eles |
| **B) Planilha Google Sheets compartilhada** | A extensão lê/grava numa planilha do Google Drive da empresa via API | +1 semana de desenvolvimento | Mais lento que um banco de dados real, mas funciona como "central" visível mesmo fora da extensão (a direção pode abrir a planilha e ver tudo) |

> **Pergunta para validar com o cliente antes de iniciar:** a La Home Care já usa **Google Workspace** (e-mails @lahomecare.com.br, por exemplo)? Se sim, a Opção A já resolve 100% sem custo nem esforço extra. Se não, a Opção B é o caminho mais simples sem precisar manter servidor.

---

## 10. Estimativa de Esforço

| Módulo | Esforço |
|--------|---------|
| Setup da extensão | 3 dias |
| Painel de Demandas Hapvida | 5 dias |
| Repassar com 1 clique | 4 dias |
| Menção rápida + favoritos | 4 dias |
| @todos + notificação de menção | 3 dias |
| Etiquetas de status | 3 dias |
| Templates + nome do atendente | 3 dias |
| Tela de configurações | 4 dias |
| Sincronização (Opção A ou B) | 3-5 dias |
| Testes com a equipe real + ajustes | 5 dias |
| **TOTAL** | **~37-40 dias úteis (~8-9 semanas)** |

---

## 11. Riscos Específicos Deste Projeto

| Risco | Mitigação |
|-------|-----------|
| WhatsApp Web atualizar e quebrar os seletores CSS | Centralizar seletores em arquivo único; revisão rápida (1-2h) sempre que o WhatsApp atualizar visualmente |
| Atendente trocar de computador ou reinstalar Chrome | Extensão privada na Web Store permite reinstalar facilmente com o mesmo link interno |
| Equipe não ter Google Workspace corporativo | Decidir Opção A ou B (seção 9) **antes** de iniciar o desenvolvimento, para não ter retrabalho |
| Hapvida usar mais de um número/contato para enviar demandas | Permitir cadastrar múltiplos números na tela de configurações (já previsto no manifest) |

---

## 12. Por Que Esse Modelo Faz Sentido Para a La Home Care

- ✅ **Custo único de desenvolvimento**, sem mensalidade de SaaS terceiro (Manyzap ou similar)
- ✅ **Sob controle total da empresa** — código e dados ficam só com a La Home Care
- ✅ **Resolve a dor real**: agilizar repasse Hapvida → equipe → prestador, com menção e encaminhamento rápido
- ✅ **Sem servidor para manter** — sem custo de infraestrutura contínua, sem DevOps
- ✅ **Tempo de entrega curto** (~2 meses) comparado a um sistema completo
- ✅ Cresce conforme a necessidade: se um dia precisar de mais (relatórios, multi-filial), pode evoluir para um backend leve sem descartar o que já foi feito

---

*Documento gerado com base na análise do sistema Manyzap (referência de fluxo de atendimento), modelo ZapMe (referência técnica de extensão) e nas necessidades específicas da La Home Care relatadas no áudio do cliente.*
