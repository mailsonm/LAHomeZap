# AGENTS.md — Lembrete de trabalho pendente

> Este arquivo é lido automaticamente por agentes de IA (opencode, Claude Code, Codex, Cursor, etc.).
> Serve como memória persistente quando o contexto é limpo ou a sessão troca de IA.

## Tarefas Concluídas Recentemente

1. **Whisper Web Local Client-Side com Transformers.js (v1.2.0)**:
   - Transcrição de áudio 100% no navegador sem necessidade de microfone físico, processando o arquivo de áudio (`blob:`) diretamente em memória.
   - Módulo interceptor no contexto da página (`world: "MAIN"`, `src/content/interceptor.ts`) executando em `document_start` para capturar `URL.createObjectURL`, `window.Audio` e `HTMLMediaElement.prototype.play` em tempo real sem conflito de isolamento de script.
   - Módulo de decodificação e reamostragem PCM (`audio-decoder.ts`) de alta performance (downmixing estéreo para mono e interpolação linear para 16kHz) e analisador de duração (`getAudioBlobDuration`).
   - Mapeamento determinístico e anti-troca por **Duração de Áudio** (`Math.abs(dur - targetDurationSec) <= 1.5`), garantindo que áudios com durações distintas (ex: 14s vs 9s) nunca sejam invertidos ou trocados.
   - Execução local do modelo `Xenova/whisper-base` quantizado com prompt contextual em português do Brasil, gerando transcrições com fidelidade máxima.
   - Persistência em cache determinístico via `chrome.storage.local` por `data-id` e fingerprint de mensagem.
2. **Paginação e Navegação na Barra de Atalhos (`Phrasebar`)**:
   - Paginação compacta com setas verticais (`▲ / ▼`), indicador `pág X/Y` e suporte a rolagem via scroll do mouse (`wheel`), evitando sobrecarga visual e quebra de layout quando há muitos atalhos cadastrados.
3. **Exportação Completa de Mídias e PDFs em HTML Autossuficiente**:
   - Extração e renderização de documentos (PDF, DOCX, etc.) com tamanho, nome e botão de download direto offline (`data:application/pdf;base64,...`).
   - Inclusão automática de caixas de transcrição STT abaixo dos players de áudio no relatório HTML.
4. **Qualidade de Código & Linter**:
   - 0 erros e 0 avisos no ESLint, 191 testes passando no Vitest (22 arquivos de teste) e compilação do bundle Manifest V3 100% íntegra.

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
