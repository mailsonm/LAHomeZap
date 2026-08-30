import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePagination } from '../usePagination';
import type { QuickReply, PaginationState } from '../../../types';

const mockReplies: QuickReply[] = [
  { id: '1', shortcut: 'teste1', text: 'Msg 1' },
  { id: '2', shortcut: 'teste2', text: 'Msg 2' },
  { id: '3', shortcut: 'teste3', text: 'Msg 3' },
  { id: '4', shortcut: 'teste4', text: 'Msg 4' },
  { id: '5', shortcut: 'teste5', text: 'Msg 5' },
  { id: '6', shortcut: 'teste6', text: 'Msg 6' },
  { id: '7', shortcut: 'teste7', text: 'Msg 7' },
  { id: '8', shortcut: 'teste8', text: 'Msg 8' },
];

function HookTestHarness({
  initialItems = mockReplies,
  pageSize = 3,
  onState,
}: {
  initialItems?: QuickReply[];
  pageSize?: number;
  onState: (state: PaginationState<QuickReply>) => void;
}) {
  const [items] = useState(initialItems);
  const pagination = usePagination(items, pageSize);
  onState(pagination);

  return (
    <div>
      <span data-testid="current-page">{pagination.currentPage}</span>
      <span data-testid="total-pages">{pagination.totalPages}</span>
      <button data-testid="prev-btn" onClick={pagination.prevPage} disabled={!pagination.canPrev}>
        Prev
      </button>
      <button data-testid="next-btn" onClick={pagination.nextPage} disabled={!pagination.canNext}>
        Next
      </button>
      <div data-testid="items">
        {pagination.pageItems.map((item) => (
          <span key={item.id} data-testid={`item-${item.shortcut}`}>
            {item.shortcut}
          </span>
        ))}
      </div>
    </div>
  );
}

describe('usePagination Hook', () => {
  it('initializes on page 1 with correct total pages and sliced items', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let capturedState!: PaginationState<QuickReply>;

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<HookTestHarness onState={(s) => { capturedState = s; }} />);
    });

    expect(capturedState.currentPage).toBe(1);
    expect(capturedState.totalPages).toBe(3); // 8 items / 3 = 3 pages
    expect(capturedState.pageItems.length).toBe(3);
    expect(capturedState.pageItems[0].shortcut).toBe('teste1');
    expect(capturedState.pageItems[2].shortcut).toBe('teste3');
    expect(capturedState.canPrev).toBe(false);
    expect(capturedState.canNext).toBe(true);

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it('navigates to next and previous pages correctly via actions', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let capturedState!: PaginationState<QuickReply>;

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<HookTestHarness onState={(s) => { capturedState = s; }} />);
    });

    const nextBtn = container.querySelector('[data-testid="next-btn"]') as HTMLButtonElement;
    const prevBtn = container.querySelector('[data-testid="prev-btn"]') as HTMLButtonElement;

    await act(async () => {
      nextBtn.click();
    });

    expect(capturedState.currentPage).toBe(2);
    expect(capturedState.pageItems.length).toBe(3);
    expect(capturedState.pageItems[0].shortcut).toBe('teste4');
    expect(capturedState.canPrev).toBe(true);
    expect(capturedState.canNext).toBe(true);

    await act(async () => {
      nextBtn.click();
    });

    expect(capturedState.currentPage).toBe(3);
    expect(capturedState.pageItems.length).toBe(2);
    expect(capturedState.pageItems[0].shortcut).toBe('teste7');
    expect(capturedState.canPrev).toBe(true);
    expect(capturedState.canNext).toBe(false);

    // Go back
    await act(async () => {
      prevBtn.click();
    });
    expect(capturedState.currentPage).toBe(2);
    expect(capturedState.pageItems[0].shortcut).toBe('teste4');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it('handles empty list gracefully', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let capturedState!: PaginationState<QuickReply>;

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<HookTestHarness initialItems={[]} onState={(s) => { capturedState = s; }} />);
    });

    expect(capturedState.currentPage).toBe(1);
    expect(capturedState.totalPages).toBe(1);
    expect(capturedState.pageItems).toEqual([]);
    expect(capturedState.canPrev).toBe(false);
    expect(capturedState.canNext).toBe(false);

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });

  it('renders Phrasebar with pagination controls when storage has many quickReplies', async () => {
    // Mock chrome.storage.sync with 8 replies
    (globalThis as any).chrome = {
      storage: {
        sync: {
          get: (_keys: string[], cb: (res: any) => void) => {
            cb({ quickReplies: mockReplies });
          },
        },
        onChanged: {
          addListener: () => {},
          removeListener: () => {},
        },
      },
    };

    const PhrasebarModule = await import('../Phrasebar');
    const Phrasebar = PhrasebarModule.default;

    const container = document.createElement('div');
    document.body.appendChild(container);

    let root: Root | undefined;
    await act(async () => {
      root = createRoot(container);
      root.render(<Phrasebar />);
    });

    // Check pagination controls are rendered
    const paginationEl = container.querySelector('.phrasebar-pagination-controls');
    expect(paginationEl).not.toBeNull();
    expect(paginationEl?.textContent).toContain('1/2'); // 8 items / 5 = 2 pages

    const nextBtn = container.querySelector('button[aria-label="Próxima página"]') as HTMLButtonElement;
    expect(nextBtn).toBeDefined();

    await act(async () => {
      nextBtn.click();
    });

    expect(paginationEl?.textContent).toContain('2/2');

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });
});

