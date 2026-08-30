# AGENTS.md — Lembrete de trabalho pendente

> Este arquivo é lido automaticamente por agentes de IA (opencode, Claude Code, Codex, Cursor, etc.).
> Serve como memória persistente quando o contexto é limpo ou a sessão troca de IA.

## Tarefas Concluídas Recentemente

1. **Paginação e Navegação na Barra de Atalhos (`Phrasebar`)**:
   - Paginação compacta com setas verticais (`▲ / ▼`), indicador `pág X/Y` e suporte a rolagem via scroll do mouse (`wheel`), evitando sobrecarga visual e quebra de layout quando há muitos atalhos cadastrados.
2. **Exportação Completa de Mídias e PDFs em HTML Autossuficiente**:
   - Extração e renderização de documentos (PDF, DOCX, etc.) com tamanho, nome e botão de download direto offline (`data:application/pdf;base64,...`).
   - Inclusão automática de caixas de transcrição STT abaixo dos players de áudio no relatório HTML.
3. **STT (Speech-to-Text) Nativo para WhatsApp Web**:
   - Injeção do botão `[📝 Transcrever]` nos players de áudio com processamento em Português (`pt-BR`) via Web Speech API / áudio nativo, cache em `chrome.storage.local` e botão de cópia rápida.
4. **Qualidade de Código & Linter**:
   - 0 erros e 0 avisos no ESLint, 166 testes passando no Vitest e compilação do bundle Manifest V3 100% íntegra.

## Tarefas Pendentes

1. **Vulnerabilidades de dependências (Dependabot)** — 17 alertas no GitHub em devDependencies (build/teste). Manter atenção a atualizações de Vite sem quebrar o build do Chrome MV3.

## Contexto Técnico Relevante

- **DOM do WhatsApp Web mudou** (ago/2026): mensagens agora usam `[data-testid="msg-container"]`,
  direção via `tail-in`/`tail-out`, texto via `span.selectable-text`, timestamp via `[data-pre-plain-text]`.
- **Clique na chatlist**: `element.click()` não abre mais a conversa; é preciso disparar a sequência
  nativa `pointerdown → mousedown → mouseup → click` (`dispatchRowClick` em `src/content/export/active-chats.ts`).
- **Build da extensão**: `build:content` usa `emptyOutDir: true` e apaga `dist/` — sempre rodar
  `npm run build` completo (tsc + content + background + options), nunca apenas `build:content`.
- Sondas temporárias de diagnóstico podem existir em `src/content/export/diagnostics.ts` — revisar se
  ainda são necessárias e removê-las quando não forem mais úteis.
