import type { Rect } from './motion';

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Selections inside form fields have no reliable rect and belong to the user's typing. */
function isInField(node: Node | null): boolean {
  const el = node instanceof Element ? node : (node?.parentElement ?? null);
  if (!el) return false;
  if (FIELD_TAGS.has(el.tagName)) return true;
  return el.closest('input, textarea, select') !== null;
}

/**
 * The first visible line of the current text selection in viewport coordinates, or null
 * when there is nothing to perch on. Read-only: never changes the selection.
 */
export function readSelectionLine(win: Window): Rect | null {
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  if (sel.toString().trim() === '') return null;
  const active = win.document.activeElement;
  if (active && FIELD_TAGS.has(active.tagName)) return null;
  if (isInField(sel.anchorNode) || isInField(sel.focusNode)) return null;

  const range = sel.getRangeAt(0);
  const rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
  for (const r of Array.from(rects)) {
    if (r.width >= 1 && r.height >= 1) {
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }
  return null;
}
