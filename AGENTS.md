# AGENTS.md — Lembrete de trabalho pendente

> Este arquivo é lido automaticamente por agentes de IA (opencode, Claude Code, Codex, Cursor, etc.).
> Serve como memória persistente quando o contexto é limpo ou a sessão troca de IA.

## Tarefas Pendentes

1. **Ajustes no Export de Conversas (Phase 7)** — o export básico já funciona, mas o usuário relatou
   "alguns ajustes" pendentes na exportação (validação real no WhatsApp Web). Abrir nova rodada de
   verificação e corrigir o que for apontado.
2. **Vulnerabilidades de dependências (Dependabot)** — 17 alertas no GitHub (9 high, 8 moderate),
   todos em devDependencies (build/teste). `npm audit fix` resolve a maioria (brace-expansion, js-yaml,
   nanoid, postcss, undici). O esbuild/vite (moderate) exige `npm audit fix --force` → vite 8 (breaking
   change): **NÃO forçar agora**, testar o build da extensão antes.

## Contexto Técnico Relevante

- **DOM do WhatsApp Web mudou** (ago/2026): mensagens agora usam `[data-testid="msg-container"]`,
  direção via `tail-in`/`tail-out`, texto via `span.selectable-text`, timestamp via `[data-pre-plain-text]`.
- **Clique na chatlist**: `element.click()` não abre mais a conversa; é preciso disparar a sequência
  nativa `pointerdown → mousedown → mouseup → click` (`dispatchRowClick` em `src/content/export/active-chats.ts`).
- **Build da extensão**: `build:content` usa `emptyOutDir: true` e apaga `dist/` — sempre rodar
  `npm run build` completo (tsc + content + background + options), nunca apenas `build:content`.
- Sondas temporárias de diagnóstico podem existir em `src/content/export/diagnostics.ts` — revisar se
  ainda são necessárias e removê-las quando não forem mais úteis.
