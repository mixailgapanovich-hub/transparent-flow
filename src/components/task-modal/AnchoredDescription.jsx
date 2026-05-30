import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';

// Описание задачи с комментариями на выделенный текст (стиль Google Docs).
// - По выделению текста показываем поповер «Комментировать» и считаем {start,end,quote}.
// - Фрагменты, к которым уже есть комментарии, подсвечиваем; клик → onFocusComment(id).
// - Деградация: если офсеты не совпали (текст изменился) — фолбэк поиск по quote.

/** Считает офсеты выделения относительно plaintext контейнера. */
function getSelectionOffsets(container) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  // start = длина текста до начала выделения
  const pre = range.cloneRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const quote = range.toString();
  const end = start + quote.length;
  if (!quote.trim()) return null;
  return { start, end, quote };
}

/** Превращает текст + список якорей в сегменты для подсветки. */
function buildSegments(text, anchors) {
  if (!text) return [{ text: '', anchorIds: [] }];
  // Нормализуем якоря к валидным офсетам (с фолбэком по quote).
  const ranges = [];
  for (const a of anchors) {
    let { start, end, quote } = a.anchor;
    if (typeof start !== 'number' || typeof end !== 'number' ||
        text.slice(start, end) !== quote) {
      // фолбэк: ищем подстроку
      const idx = quote ? text.indexOf(quote) : -1;
      if (idx === -1) continue; // не нашли — комментарий покажется только в ленте
      start = idx;
      end = idx + quote.length;
    }
    ranges.push({ start, end, id: a.id });
  }
  if (ranges.length === 0) return [{ text, anchorIds: [] }];

  // Точки границ
  const bounds = new Set([0, text.length]);
  ranges.forEach((r) => { bounds.add(r.start); bounds.add(r.end); });
  const sorted = [...bounds].sort((x, y) => x - y);

  const segs = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (to <= from) continue;
    const anchorIds = ranges.filter((r) => r.start <= from && r.end >= to).map((r) => r.id);
    segs.push({ text: text.slice(from, to), anchorIds });
  }
  return segs;
}

export default function AnchoredDescription({ text, anchoredComments = [], onStartComment, onFocusComment }) {
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null); // {x, y, anchor}

  const segments = useMemo(
    () => buildSegments(text ?? '', anchoredComments),
    [text, anchoredComments],
  );

  const handleMouseUp = () => {
    const container = containerRef.current;
    if (!container) return;
    const offsets = getSelectionOffsets(container);
    if (!offsets) { setPopover(null); return; }
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    const box = container.getBoundingClientRect();
    setPopover({
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top,
      anchor: offsets,
    });
  };

  // Прячем поповер при клике вне выделения
  useLayoutEffect(() => {
    if (!popover) return undefined;
    const onDown = (e) => {
      if (e.target.closest?.('[data-anchor-popover]')) return;
      setPopover(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [popover]);

  if (!text?.trim()) {
    return <p className="text-sm text-slate-400 italic">Описание не заполнено.</p>;
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap select-text"
      >
        {segments.map((seg, i) =>
          seg.anchorIds.length > 0 ? (
            <mark
              key={i}
              onClick={() => onFocusComment?.(seg.anchorIds[0])}
              className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm transition-colors"
              title="Комментарий клиента — нажмите, чтобы открыть"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </div>

      {popover && onStartComment && (
        <div
          data-anchor-popover
          style={{ left: popover.x, top: popover.y }}
          className="absolute -translate-x-1/2 -translate-y-full z-20 mb-1"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onStartComment(popover.anchor);
              setPopover(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#3C50B4] px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:brightness-110"
          >
            <MessageSquarePlus size={13} /> Комментировать
          </button>
        </div>
      )}
    </div>
  );
}
