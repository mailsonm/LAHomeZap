import { describe, it, expect } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import ExportTab from '../ExportTab';

describe('ExportTab', () => {
  it('renders the export panel header and the automation toggle', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<ExportTab />);
    });

    expect(container.textContent).toContain('Exportar Conversas');
    expect(container.textContent).toContain('Exportar conversas ativas (24h)');
    expect(container.textContent).toContain('Automação diária');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it('renders hour/minute inputs after enabling automation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<ExportTab />);
    });

    const toggle = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ativar automação')
    );
    expect(toggle).toBeDefined();

    await act(async () => {
      toggle?.click();
    });

    expect(container.querySelector('[aria-label="Hora"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Minuto"]')).not.toBeNull();

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });
});