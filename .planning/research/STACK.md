# Stack Research

**Domain:** Chrome Extension (Manifest V3) for WhatsApp Web integration
**Researched:** 2026-06-26
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.x | Tipagem estática e segurança do código | Melhora a produtividade, auto-complete nos seletores do WhatsApp e previne bugs de runtime. |
| React | 18.x | Construção da UI (Painel Kanban, Menus) | Facilita a reatividade e componentização do Painel de Demandas e menus de menções rápidas. |
| Vite | 5.x | Bundler ultra-rápido e ambiente dev | Fornece Hot Module Replacement (HMR) rápido no desenvolvimento de extensões Chrome. |
| CSS Vanilla (Modules) | N/A | Estilização dos componentes injetados | CSS nativo garante isolamento de estilos (evitando conflito com estilos nativos do WhatsApp) e leveza. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 0.x | Ícones modernos e limpos | Para uso nos ícones do Kanban, botões de ação e painel de opções. |
| Webextension Polyfill | 0.11.x | Compatibilidade cross-browser | Caso queira portar para Firefox futuramente; facilita uso de Promises nas APIs do Chrome. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @types/chrome | Tipagem da API do Chrome Extension | Crucial para ter IntelliSense ao usar `chrome.storage.sync` e `chrome.runtime`. |
| ESLint & Prettier | Padronização de código | Mantém a legibilidade e consistência do código do time. |

## Installation

```bash
# Core & UI
npm install react react-dom lucide-react

# Dev dependencies
npm install -D typescript @types/react @types/react-dom @types/chrome vite @vitejs/plugin-react eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite + React | Vanilla JS | Apenas se o projeto fosse extremamente simples (100 linhas). O Painel Kanban e Menu de Menções necessitam de manipulação de estado complexa que React facilita grandemente. |
| chrome.storage.sync | Google Sheets API | Se a equipe não usasse Google Workspace corporativo logado no Chrome. Contudo, chrome.storage.sync é muito mais rápido e nativo. |
| CSS Vanilla / CSS Modules | TailwindCSS | Apenas se solicitado pelo usuário. Em extensões, injetar classes utilitárias de Tailwind pode interferir com a folha de estilos do WhatsApp Web se não for encapsulado em Shadow DOM. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| jQuery | Peso desnecessário e padrões antigos de manipulação do DOM. | Vanilla DOM APIs (`querySelector`, `MutationObserver`). |
| Manifest V2 | Obsoleto e descontinuado pelo Google Chrome. | Manifest V3 |
| Seletores CSS baseados em hash (ex: `.x2b8112`) | Mudam constantemente a cada build do WhatsApp Web, quebrando a extensão. | Seletores baseados em atributos (`[data-testid="..."]`) ou caminhos estruturais robustos. |

## Stack Patterns by Variant

**If Shadow DOM Injection:**
- Use Shadow DOM para injetar componentes React na UI do WhatsApp Web.
- Porque isso isola completamente o CSS do WhatsApp Web do CSS da nossa extensão, prevenindo problemas visuais indesejados.

**If chrome.storage.sync Quota limit:**
- Armazene dados volumosos (histórico antigo de demandas) no `chrome.storage.local` e use `chrome.storage.sync` apenas para configurações, membros e referências ativas de demandas.
- Porque o `chrome.storage.sync` tem limite rígido de 100KB totais.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React@18 | Vite@5 | Funciona perfeitamente out of the box com o plugin `@vitejs/plugin-react`. |
| Typescript@5 | @types/chrome | Fornece tipagem correta para o Manifest V3. |

## Sources

- [Chrome Developer Docs](https://developer.chrome.com/docs/extensions/mv3/) — Manifest V3 APIs & Storage limits.
- [React Official Docs](https://react.dev/) — Component state patterns.

---
*Stack research for: WhatsApp Web Chrome Extension*
*Researched: 2026-06-26*
