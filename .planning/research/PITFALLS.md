# Pitfalls Research

**Domain:** WhatsApp Web Integration Extensions
**Researched:** 2026-06-26
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Alteração do Valor do Input do WhatsApp Web Não Disparar o Estado do React (Mensagem Vazia)

**What goes wrong:**
Se a extensão apenas alterar o valor do elemento HTML de entrada (`messageInput.innerText = "Frase padrão"`) e simular o envio, o WhatsApp Web envia uma mensagem vazia ou a mensagem antiga. A caixa de entrada do WhatsApp Web é gerenciada pelo React e precisa de eventos nativos para atualizar seu estado interno.

**Why it happens:**
O WhatsApp Web vincula a entrada a um componente controlado do React. Alterações diretas no DOM de texto (como `innerText` ou `innerHTML`) não ativam os ouvintes de eventos sintéticos do React.

**How to avoid:**
Usar a API nativa `document.execCommand('insertText', false, text)` enquanto o elemento de entrada (`div[contenteditable="true"]`) está focado. Esse comando simula com precisão a digitação do usuário e atualiza corretamente a árvore de estado do React do WhatsApp Web.

**Warning signs:**
Mensagens enviadas pela extensão parecem corretas na tela, mas desaparecem após recarregar a página, ou o botão de "Enviar" nativo não aparece/continua desabilitado mesmo com o texto preenchido.

**Phase to address:**
Fase 1 (Setup e Seletores do DOM) e Fase 3 (Lógica de inserção de templates).

---

### Pitfall 2: Meta Atualizar a UI do WhatsApp Web e Quebrar os Seletores CSS

**What goes wrong:**
A extensão para de funcionar repentinamente para todos os atendentes. O painel lateral não abre, as menções `@@` não respondem ou novas demandas do Hapvida não aparecem no Kanban.

**Why it happens:**
A Meta (empresa dona do WhatsApp) faz atualizações contínuas no WhatsApp Web, gerando novas classes utilitárias baseadas em hashes randômicos (ex: `.x2b8112`) que quebram seletores estáticos da extensão.

**How to avoid:**
1. Nunca utilizar nomes de classes com hashes.
2. Priorizar seletores baseados em atributos persistentes do WhatsApp, como `data-testid` (ex: `[data-testid="conversation-panel-body"]`, `[data-testid="msg-container"]`).
3. Centralizar todos os seletores CSS/XPath em um arquivo comum (`dom-selectors.ts`). Se o WhatsApp atualizar, a manutenção é feita em um único ponto em 5 minutos.

**Warning signs:**
Erros no console do Chrome indicando `TypeError: Cannot read properties of null (reading 'querySelector')` ao abrir conversas.

**Phase to address:**
Fase 1 (Setup inicial e centralização de seletores).

---

### Pitfall 3: Estouro da Cota do `chrome.storage.sync` (Cota Limite de 100KB)

**What goes wrong:**
Atendentes começam a receber erros de escrita ao atualizar o status das demandas, impedindo a sincronização das informações do Kanban entre os computadores.

**Why it happens:**
O `chrome.storage.sync` é gratuito e sincronizado em tempo real pelo Chrome via conta do Google, mas tem restrições muito severas: limite máximo de 100KB totais de dados, limite de 8KB por chave individual, e máximo de 120 escritas por minuto.

**How to avoid:**
1. Armazenar apenas as configurações, a lista de prestadores e as demandas ativas do dia no `storage.sync`.
2. Remover (prunar) automaticamente demandas arquivadas ou concluídas há mais de 24 horas.
3. Não armazenar grandes payloads de texto nas mensagens das demandas (apenas cabeçalhos, nomes e status curtos).

**Warning signs:**
Mensagens de erro no console da extensão como `runtime.lastError: This value exceeds the maximum size limit of chrome.storage.sync`.

**Phase to address:**
Fase 1 (Implementação básica do Kanban e Storage Provider).

---

### Pitfall 4: Execução de IA Neural/WASM Multi-thread (Whisper/ONNX) em Content Scripts do WhatsApp Web

**What goes wrong:**
Tentativa de executar pipelines neurais pesados (`@xenova/transformers`, `onnxruntime-web`) diretamente no Content Script do WhatsApp Web trava em loop de dependências (`still waiting on run dependencies: wasm-instantiate`), sofre com bloqueios de CSP (Content Security Policy) da Meta, falta de cabeçalhos COOP/COEP para `SharedArrayBuffer`, e gera alto consumo de memória/crash da aba.

**Why it happens:**
1. O WhatsApp Web não envia cabeçalhos `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`. Sem eles, o navegador desabilita `SharedArrayBuffer`, quebrando o multi-threading padrão do ONNX Runtime Web.
2. Content scripts rodam no contexto da aba do WhatsApp, onde o ciclo de vida do áudio é gerenciado em memória pelo player interno (muitas vezes sem `<audio>` no DOM ou com descarte imediato de blobs).
3. O download de arquivos `.onnx` (~40MB a 150MB) pode ser bloqueado pela política de rede ou demorar em conexões corporativas lentas.

**How to avoid:**
1. **Forçar Modo Single-Thread:** Configurar explicitamente `env.backends.onnx.wasm.numThreads = 1` e `env.backends.onnx.wasm.proxy = false` para desabilitar Web Workers com `SharedArrayBuffer`.
2. **Media Interception:** Interceptar `URL.createObjectURL` e `window.Audio` para capturar os buffers e URLs `blob:` no exato momento da instanciação pelo WhatsApp.
3. **Fallback Robusto e Resiliente:** Sempre manter como fallback a Web Speech API (`webkitSpeechRecognition`) ou Offscreen Documents caso o WASM local falhe por restrição de memória.
4. **Sanitização de Cache:** Nunca salvar mensagens de falha ou "Nenhuma fala detectada" no cache para permitir novas tentativas limpas.

**Warning signs:**
Loops de `postMessage` no console com `v9MfIESiyIM.js: dependency: wasm-instantiate` ou falha de alocação de memória WASM.

**Phase to address:**
Fase 4 (Módulo STT e Transcrição de Áudio).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Não usar Shadow DOM para injeção | Mais rápido para estilizar e codificar no início. | O CSS do WhatsApp colide com o CSS da extensão, quebrando o layout da extensão em telas menores ou com zoom. | Nunca. O isolamento com Shadow DOM é obrigatório em injeções complexas de DOM. |
| Pooling repetitivo (`setInterval`) | Fácil de implementar para detectar novos chats. | Consumo excessivo de bateria, lentidão no Chrome dos atendentes (especialmente em computadores mais antigos de escritório). | Apenas para testes curtos ou spikes de validação rápidos de 1 dia. |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WhatsApp Web DOM Interception | Tentar ler a lista de chats inteira antes dela ser renderizada na tela. | Aguardar o elemento pai da lista de chats (`[data-testid="chat-list"]`) surgir no DOM usando MutationObserver ou Promises de espera antes de aplicar badges ou ler. |
| Inserção de Badges de Status | Inserir múltiplos badges do mesmo status na mesma conversa em re-renderizações consecutivas. | Verificar se o badge com id único já existe no elemento da conversa antes de injetar outro (`if (document.getElementById(uniqueId)) return`). |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| MutationObserver Genérico | Lentidão absurda e travamento ao rolar o chat. | Observar apenas nós filhos necessários e ignorar mutações de atributos de estilo ou imagens. | Ao abrir conversas com milhares de mensagens com mídia. |
| Escritas frequentes no storage | Bloqueio de gravação no Chrome por limite de escrita (120/min). | Debounce/Throttle nas ações de arrastar cards no Kanban ou salvar status. | Se múltiplos atendentes moverem vários cards simultaneamente no Kanban lateral. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Salvar credenciais no storage local sem criptografia | Se o computador de um atendente for invadido ou compartilhado, credenciais confidenciais podem ser lidas por outras extensões. | Não armazenar credenciais ou tokens confidenciais da empresa na extensão. O sistema deve operar de forma "stateless" e baseada na sessão ativa do usuário. |
| Usar `eval()` ou injetar scripts remotos | Rejeição imediata em análises de segurança do Chrome, além de permitir ataques de injeção de script (XSS). | Todo código JS deve ser local e empacotado no bundle. Usar Manifest V3 que bloqueia execuções dinâmicas remotas por padrão. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|-------------|-----------------|-----------------|
| Kanban lateral gigante sobrepondo o chat ativo | O atendente não consegue ver o texto que está digitando no WhatsApp nativo. | Injetar o Kanban de forma responsiva, diminuindo a largura do painel central do WhatsApp Web proporcionalmente ou permitindo "minimizar/maximizar" o Kanban lateral com um clique. |

## "Looks Done But Isn't" Checklist

- [ ] **Injeção do Painel Kanban:** Funciona bem em tela cheia, mas quebra quando a janela do Chrome é dividida ao meio ou o zoom está alto. -> Verificar responsividade da injeção.
- [ ] **Mapeamento de Mensagens Hapvida:** Funciona para a primeira mensagem que chega na conversa aberta, mas não detecta se a mensagem chegar em uma conversa de background. -> Monitorar MutationObserver da lista de conversas esquerda.
- [ ] **Mencionador Rápido (`@@`):** Funciona para inputs simples, mas quebra em inputs com quebras de linha (shift + enter). -> Testar input com múltiplas linhas e cursor no meio do texto.

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Alteração de input gerenciada por React | Fase 1 | Validar se o envio de frases padrão nativas é recebido pelo destinatário após recarregar a conversa. |
| Alteração do layout do WhatsApp | Fase 1 | Escrever testes e usar seletores `data-testid` isolados centralmente. |
| Limite de Storage Sync (100KB) | Fase 2 | Validar mecanismo de limpeza automática de demandas arquivadas mais velhas que 24h. |

---
*Pitfalls research for: WhatsApp Web Chrome Extension*
*Researched: 2026-06-26*
