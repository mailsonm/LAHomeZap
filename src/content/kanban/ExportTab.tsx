import { useState, useEffect } from 'react';
import { Download, Clock, Check, Loader2 } from 'lucide-react';
import type { ExportConfig } from '../../types';
import { DEFAULT_EXPORT_CONFIG, EXPORT_SYNC_MESSAGE_TYPE, STORAGE_KEYS } from '../../constants';
import { storageGet, storageSet } from '../../utils/storage';
import { runDailyExport, type ExportProgress } from '../export/pipeline';
import { downloadHtml } from '../export/download';

function ExportTab() {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [summary, setSummary] = useState<{ exported: number; skipped: number; errors: number } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storageGet<ExportConfig>(STORAGE_KEYS.exportConfig).then((stored) => {
      if (stored) setConfig({ ...DEFAULT_EXPORT_CONFIG, ...stored });
    });
  }, []);

  const handleExportNow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(null);
    setSummary(null);

    try {
      const outcome = await runDailyExport({ onProgress: setProgress });
      for (const file of outcome.files) {
        await downloadHtml(file.html, file.filename);
      }
      setSummary({
        exported: outcome.files.length,
        skipped: outcome.skipped.length,
        errors: outcome.errors.length,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveAutomation = async () => {
    await storageSet(STORAGE_KEYS.exportConfig, config);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: EXPORT_SYNC_MESSAGE_TYPE });
      } catch (e) {
        console.warn('[La Home Zap] Failed to notify background export config:', e);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setHour = (value: string) => {
    const hour = Math.min(23, Math.max(0, Number(value) || 0));
    setConfig((prev) => ({ ...prev, hour }));
  };

  const setMinute = (value: string) => {
    const minute = Math.min(59, Math.max(0, Number(value) || 0));
    setConfig((prev) => ({ ...prev, minute }));
  };

  const statusLabel = progress ? {
    collecting: `Coletando mensagens de ${progress.chatName}...`,
    exported: `${progress.chatName}: ${progress.messageCount} mensagens exportadas`,
    empty: `${progress.chatName}: sem atividade no período`,
    error: `Falha ao exportar ${progress.chatName}`,
  }[progress.status] : null;

  return (
    <div className="sidebar-panel-container">
      <div className="sidebar-panel-header">
        <h1>Exportar Conversas</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
        <div style={{ fontSize: '11.5px', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', lineHeight: 1.5 }}>
          💡 Exporta as conversas com <strong>atividade nas últimas 24h</strong> em um
          HTML imprimível por conversa, com data/hora, remetente e marcadores de mídia.
        </div>

        <button
          type="button"
          className="btn-add-card"
          onClick={handleExportNow}
          disabled={isRunning}
          style={{ width: '100%', justifyContent: 'center', gap: '8px', opacity: isRunning ? 0.6 : 1, cursor: isRunning ? 'wait' : 'pointer' }}
        >
          {isRunning ? <Loader2 size={14} className="export-spin" /> : <Download size={14} />}
          {isRunning ? 'Exportando...' : 'Exportar conversas ativas (24h)'}
        </button>

        {statusLabel && (
          <div style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '10px 12px', borderRadius: '8px' }}>
            {statusLabel}
          </div>
        )}

        {summary && (
          <div style={{ fontSize: '12px', color: '#e2e8f0', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px 12px', borderRadius: '8px' }}>
            ✔ Exportação concluída — {summary.exported} conversa(s), {summary.skipped} sem atividade, {summary.errors} erro(s).
          </div>
        )}

        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Clock size={14} color="#06b6d4" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Automação diária</span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '10px' }}>
            Exporta automaticamente as conversas ativas todos os dias no horário configurado,
            enquanto o WhatsApp Web estiver aberto.
          </div>

          <button
            type="button"
            className="btn-form-action"
            onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
            style={{
              width: '100%',
              padding: '10px',
              background: config.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${config.enabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: config.enabled ? '#34d399' : '#94a3b8',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {config.enabled ? '✓ Automação ativada' : 'Ativar automação'}
          </button>

          {config.enabled && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Horário diário</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={config.hour}
                    onChange={(e) => setHour(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', textAlign: 'center' }}
                    aria-label="Hora"
                  />
                  <span style={{ alignSelf: 'center', color: '#64748b' }}>:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={config.minute}
                    onChange={(e) => setMinute(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', textAlign: 'center' }}
                    aria-label="Minuto"
                  />
                </div>
              </div>
              <button type="button" className="btn-form-action btn-form-confirm" onClick={handleSaveAutomation} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '9px 12px' }}>
                {saved ? <Check size={12} /> : null}
                {saved ? 'Salvo' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExportTab;