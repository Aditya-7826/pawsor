import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSelectionLine } from './selection';

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height } as DOMRect;
}

function select(node: Node, rects: DOMRect[]): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  Object.defineProperty(range, 'getClientRects', { value: () => rects });
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('readSelectionLine', () => {
  it('returns null without a selection', () => {
    expect(readSelectionLine(window)).toBeNull();
  });

  it('returns the first non-empty line rect', () => {
    document.body.innerHTML = '<p id="p">Some cozy text to highlight</p>';
    const p = document.getElementById('p') as HTMLElement;
    select(p, [rect(0, 0, 0, 0), rect(20, 100, 180, 22), rect(20, 122, 90, 22)]);
    expect(readSelectionLine(window)).toEqual({ left: 20, top: 100, width: 180, height: 22 });
  });

  it('ignores whitespace-only selections', () => {
    document.body.innerHTML = '<p id="p">   </p>';
    select(document.getElementById('p') as HTMLElement, [rect(0, 0, 10, 10)]);
    expect(readSelectionLine(window)).toBeNull();
  });

  it('ignores selections inside form fields', () => {
    document.body.innerHTML = '<label id="l">Name <textarea>typed words</textarea></label>';
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    select(textarea, [rect(0, 0, 100, 20)]);
    expect(readSelectionLine(window)).toBeNull();
  });

  it('never changes the selection', () => {
    document.body.innerHTML = '<p id="p">Keep me selected</p>';
    select(document.getElementById('p') as HTMLElement, [rect(0, 0, 100, 20)]);
    readSelectionLine(window);
    expect(window.getSelection()?.toString()).toBe('Keep me selected');
  });
});
