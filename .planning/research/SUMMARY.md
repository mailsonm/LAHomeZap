# Project Research Summary

**Project:** La Home Zap
**Domain:** Chrome Extension Manifest V3 for WhatsApp Web Integration
**Researched:** 2026-06-26
**Confidence:** HIGH

## Executive Summary

O projeto **La Home Zap** consiste em uma extensão de navegador exclusiva da La Home Care para otimizar os fluxos de atendimento operacional via WhatsApp Web/Business. Ele automatiza a triagem e o encaminhamento de demandas da Hapvida e melhora a eficiência de menção de supervisores e prestadores em grupos internos.

Após profunda análise técnica sobre extensões em páginas de terceiros, constatou-se que o maior desafio reside no acoplamento visual e reativo com o WhatsApp Web (Meta). A stack proposta utiliza Vite + React + TypeScript com injeção isolada via Shadow DOM. A sincronização de dados entre atendentes (4 a 10 pessoas) será efetuada de forma nativa e sem custos via `chrome.storage.sync`, aproveitando as contas organizacionais integradas do Google Workspace.

Os maiores riscos identificados — quebras de layout devido a atualizações do WhatsApp Web e limites severos de cota do storage do Chrome — são mitigados por uma estratégia de isolamento de seletores DOM e limpeza de histórico de demandas ativas com mais de 24 horas de conclusão.

## Key Findings

### Recommended Stack

Extensão Chrome Manifest V3 compilada com Vite 5 e utilizando React 18 + TypeScript para criação rápida de interfaces integradas ao DOM.

**Core technologies:**
- **TypeScript (5.x)**: Fornece segurança e auto-complete cruciais em manipulações de DOM complexas.
- **React (18.x)**: Utilizado para a reatividade do Kanban lateral e popovers de menções.
- **Vite (5.x)**: HMR rápido e compilação otimizada para desenvolvimento de extensões.
- **CSS Vanilla (Modules)**: Garante estilos isolados quando aplicados sob Shadow DOM.

### Expected Features

**Must have (table stakes):**
- **Painel Kanban Lateral** — Gerenciador visual de demandas integrado na tela do WhatsApp.
- **Detecção de Mensagens Hapvida** — Auto-povoar o Kanban lendo mensagens recebidas de contatos específicos.
- **Repasse Rápido com 1 clique** — Encaminhar mensagens rapidamente usando atalhos para grupos definidos.
- **Menção Rápida (`@@`)** — Menu popover rápido com favoritos da coordenação.
- **Tela de Opções** — Configurar telefones da operadora, frases padrão e contatos favoritos.

**Should have (competitive):**
- **Sincronização Sincera** — Uso do `chrome.storage.sync` para compartilhamento instantâneo de dados.
- **Badges de Status** — Etiquetas coloridas diretamente na lista de conversas.
- **Templates com Variáveis** — Frases padrão com campos dinâmicos preenchidos via interface.
- **Menção `@todos`** — Comando para notificar todos do grupo buscando participantes no DOM.

**Defer (v2+):**
- **Servidor centralizado** — Não necessário para o volume e quantidade de usuários atuais (4-10 atendentes).

### Architecture Approach

A extensão rodará localmente no navegador de cada atendente. A interface de configurações estará na Options Page e a injeção principal ocorrerá via Content Script injetado em `web.whatsapp.com`. 

**Major components:**
1. **Content Script & DOM Observer** — Escuta mutações do DOM e injeta elementos React isolados via Shadow DOM.
2. **React Roots (Kanban / Menus)** — Componentes dinâmicos e reativos de interface de usuário.
3. **Storage Provider** — Gerenciador de leitura e escrita baseado em `chrome.storage.sync` com limpeza automática de dados antigos.

### Critical Pitfalls

1. **Atualizações de Layout do WhatsApp Web** — Contornado isolando seletores baseados em `data-testid` em um arquivo de seletores unificado.
2. **React Controlled Input State** — Para simular entrada de texto na caixa de mensagem, deve-se usar `document.execCommand('insertText')` para garantir que o React do WhatsApp Web registre o texto inserido.
3. **Estouro de Cota no Storage** — Limite de 100KB do `chrome.storage.sync` exige exclusão automática de demandas concluídas há mais de 24 horas.

## Implications for Roadmap

Com base nas dependências de arquitetura e mitigação de riscos, sugere-se a seguinte estrutura de desenvolvimento:

### Phase 1: Setup e Funcionalidades Críticas
**Rationale:** Iniciar com o esqueleto da extensão e a lógica mais complexa (seletores do DOM e encaminhamento automatizado) garante mitigar os maiores riscos logo de início.
**Delivers:** Esqueleto Manifest V3 (Vite + React), centralização de seletores do WhatsApp, Painel Kanban Lateral funcional e fluxo de repasse rápido (encaminhar).
**Addresses:** Painel Kanban, Detecção de demandas, Repasse com 1 clique.
**Avoids:** Incompatibilidades com o DOM e problemas de inserção no input do WhatsApp.

### Phase 2: Menções e Comunicação
**Rationale:** Desenvolver a lógica de interface interativa dentro da caixa de texto do WhatsApp.
**Delivers:** Popover de menção rápida baseado em gatilho `@@`, favoritos por grupo, formatação urgente e `@todos` do grupo.
**Addresses:** Menção Rápida (`@@`), `@todos` e marcação urgente.

### Phase 3: Status e Customização
**Rationale:** Adicionar metadados visuais de status e recursos para ganho de velocidade no atendimento.
**Delivers:** Badges de status injetados na lista de chats, painel de frases padrão com substituição de variáveis e assinatura automática do atendente.
**Addresses:** Etiquetas de status, Frases padrão, Assinatura automática.

### Phase 4: Configurações e Deploy
**Rationale:** Finalizar a consolidação do armazenamento e validação de deploy em lote.
**Delivers:** Página de Opções (Options screen), sincronização automatizada final via `chrome.storage.sync` e deploy privado/não listado para testes práticos da equipe.
**Addresses:** Tela de configurações, sincronia de storage e empacotamento.

### Research Flags

Fases que necessitam de cuidados adicionais:
- **Phase 1 (DOM Interaction):** A manipulação do modal de encaminhamento do WhatsApp Web requer engenharia reversa leve dos botões nativos.
- **Phase 2 (DOM Scraping):** Puxar a lista de todos os membros do grupo requer abrir e ler a barra lateral de detalhes do grupo no DOM.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vite + React + TS é o padrão de excelência atual e amplamente testado em extensões Chrome. |
| Features | HIGH | Direto e alinhado com o plano de negócios desenhado no plano_la_home_zap.md. |
| Architecture | HIGH | Shadow DOM e chrome.storage.sync mitigam as duas maiores preocupações técnicas sem complexidade de infraestrutura. |
| Pitfalls | HIGH | Identificação prévia do comportamento do input gerenciado por React e dos limites de storage. |

**Overall confidence:** HIGH

### Gaps to Address

- **Alteração futura no DOM do WhatsApp Web:** O time precisa estar ciente que em algum momento no futuro a Meta pode atualizar a estrutura do DOM, demandando uma atualização rápida nos seletores centralizados da extensão.

## Sources

- [Chrome Developer Docs](https://developer.chrome.com/docs/extensions/)
- [plano_la_home_zap.md](file:///home/mailson/Documentos/GitHub/LAHomeZap/plano_la_home_zap.md)

---
*Research completed: 2026-06-26*
*Ready for roadmap: yes*
