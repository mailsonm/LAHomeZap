<!-- GSD:project-start source:PROJECT.md -->

## Project

**La Home Zap**

Uma extensão exclusiva do Google Chrome para o WhatsApp Web/Business que permite aos atendentes da La Home Care gerenciar e repassar demandas recebidas do Hapvida de forma rápida, eficiente e centralizada. O projeto é de uso interno e focado em otimizar a comunicação diária sem a necessidade de uma infraestrutura de servidor complexa.

**Core Value:** Agilizar o repasse de demandas do Hapvida para os prestadores/equipe internos diretamente no WhatsApp Web, eliminando tarefas repetitivas e garantindo rastreabilidade do atendimento.

### Constraints

- **Tech Stack**: Extensão Chrome Manifest V3, HTML/CSS/JS (React + Vite + TypeScript).
- **Dependência do DOM do WhatsApp**: Alterações visuais feitas pela Meta no WhatsApp Web podem quebrar seletores da extensão, exigindo manutenção centralizada dos seletores.
- **Limites do Storage**: O `chrome.storage.sync` possui limites de cota por item (8KB) e total (100KB), o que restringe o volume de dados salvos (adequado para o escopo de 4-10 atendentes e dados leves).

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

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

# Core & UI

# Dev dependencies

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

- Use Shadow DOM para injetar componentes React na UI do WhatsApp Web.
- Porque isso isola completamente o CSS do WhatsApp Web do CSS da nossa extensão, prevenindo problemas visuais indesejados.
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

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
