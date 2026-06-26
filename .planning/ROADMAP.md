# Roadmap: La Home Zap

## Overview

O desenvolvimento do La Home Zap seguirá uma abordagem de MVP Vertical para entregar funcionalidades testáveis e de alto valor operacional o quanto antes. Iniciaremos pelo setup da extensão e pela customização do nome do atendente (requisito prioritário para identificação de autoria), seguido pela tela de opções e sincronização via Chrome storage. Depois, construiremos as interfaces integradas ao WhatsApp Web: o painel Kanban responsivo para controle de demandas, o modal de repasse rápido, e o menu de menção rápida via `@@`. Por fim, implementaremos a lógica de pruning automático para conformidade técnica de cota de storage e validação de deploy da v1.

## Phases

- [x] **Phase 1: Foundation & Custom Attendant Name** - Setup da extensão e injeção do nome do atendente em negrito.
- [ ] **Phase 2: Options Page & Storage Sync** - Tela de configurações e sincronização automática via storage do Chrome.
- [ ] **Phase 3: Kanban Panel Integration** - Painel lateral Kanban injetado responsivamente no WhatsApp Web.
- [ ] **Phase 4: Quick Forward Modal** - Modal de repasse rápido com lista de favoritos.
- [ ] **Phase 5: Quick Mention Menu (@@)** - Popover de menções rápidas acionado por "@@".
- [ ] **Phase 6: Pruning & Final Adjustments** - Pruning automático de demandas concluídas e polimento geral.

## Phase Details

### Phase 1: Foundation & Custom Attendant Name
**Goal**: Configurar o ambiente Manifest V3 e injetar a identificação do atendente em negrito no topo de suas mensagens.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: STAT-01
**Success Criteria** (what must be TRUE):
  1. Extensão compilável no ambiente Vite + TS e instalável no Chrome em modo desenvolvedor.
  2. Nome do atendente configurado é adicionado em negrito no topo da mensagem ao digitar/enviar no WhatsApp Web.
**Plans**: 2 plans

Plans:
- [x] 01-01: Setup do esqueleto da extensão Manifest V3, configurações do Vite e arquivo comum de seletores do DOM.
- [x] 01-02: Desenvolvimento do Content Script para captura e manipulação da caixa de entrada do WhatsApp, inserindo o nome em negrito.

### Phase 2: Options Page & Storage Sync
**Goal**: Desenvolver a tela de opções da extensão e a sincronização compartilhada dos dados via Chrome Sync.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Página de Opções permite configurar o nome do atendente e cadastrar grupos/prestadores favoritos.
  2. Configurações salvas em um computador são sincronizadas com outros via `chrome.storage.sync`.
**Plans**: 2 plans

Plans:
- [ ] 02-01: UI da Options Page em React para gerenciamento das configurações da extensão.
- [ ] 02-02: Wrapper de Storage integrado com `chrome.storage.sync` para sincronia automática de dados.

### Phase 3: Kanban Panel Integration
**Goal**: Injetar o painel Kanban na interface do WhatsApp de forma responsiva e com suporte a manipulação manual dos cards.
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: KANB-01, KANB-02
**Success Criteria** (what must be TRUE):
  1. Painel lateral Kanban é injetado no DOM via Shadow DOM para evitar vazamento de estilos.
  2. Painel pode ser minimizado/maximizado, redimensionando a janela principal do WhatsApp.
  3. Usuário pode criar e arrastar cards de demanda manualmente entre as colunas do painel lateral.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Injeção do layout e container Shadow DOM para o painel lateral do Kanban no WhatsApp Web.
- [ ] 03-02: Desenvolvimento do Kanban React com lógica de movimentação de cards e controle de minimizar/maximizar.

### Phase 4: Quick Forward Modal
**Goal**: Implementar o modal rápido de favoritos para encaminhamento manual agilizado de mensagens.
**Mode**: mvp
**Depends on**: Phase 3
**Requirements**: FORW-01
**Success Criteria** (what must be TRUE):
  1. Modal contendo atalhos dos grupos e prestadores favoritos configurados é exibido ao acionar o fluxo de repasse.
  2. O modal facilita o repasse manual exibindo caminhos diretos aos chats prioritários.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Implementação da UI do Modal Rápido de favoritos e injeção do componente na tela.
- [ ] 04-02: Lógica de integração do modal de repasse com as preferências do atendente.

### Phase 5: Quick Mention Menu (@@)
**Goal**: Interceptar a digitação de `@@` e apresentar o popover de menção rápida aos favoritos.
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: MENT-01
**Success Criteria** (what must be TRUE):
  1. Menu popover com a lista de favoritos surge na tela imediatamente acima da caixa de texto ao digitar `@@`.
  2. Selecionar um nome insere a menção correta utilizando a API React nativa via `execCommand`.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Listener no content script para detecção do gatilho `@@` e cálculo de coordenadas da caixa de texto.
- [ ] 05-02: Componente popover de menção React e lógica de injeção segura no DOM do input gerenciado pelo React.

### Phase 6: Pruning & Final Adjustments
**Goal**: Implementar o pruning automático de dados para respeitar limites de cota de armazenamento e polimento da v1.
**Mode**: mvp
**Depends on**: Phase 5
**Requirements**: CONF-03
**Success Criteria** (what must be TRUE):
  1. Demandas concluídas com mais de 24 horas são expurgadas automaticamente do storage de sincronia, respeitando o limite de 100KB.
  2. Todos os requisitos da v1 integrados e validados ponta a ponta.
**Plans**: 2 plans

Plans:
- [ ] 06-01: Desenvolvimento da lógica de pruning de demandas arquivadas e monitoramento de cota do Chrome storage.
- [ ] 06-02: Validação de usabilidade, correções estéticas gerais e preparação do guia de deploy privado.

## Progress

Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Custom Attendant Name | 2/2 | Completed | 2026-06-26 |
| 2. Options Page & Storage Sync | 0/2 | Not started | - |
| 3. Kanban Panel Integration | 0/2 | Not started | - |
| 4. Quick Forward Modal | 0/2 | Not started | - |
| 5. Quick Mention Menu (@@) | 0/2 | Not started | - |
| 6. Pruning & Final Adjustments | 0/2 | Not started | - |
