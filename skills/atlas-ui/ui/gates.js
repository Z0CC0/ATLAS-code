/* gates.js: the numbers of a rendered page, measured inside the page before anyone judges it.
 *
 * One function expression, no dependency, so the same file runs everywhere:
 *   playwright-cli -s=ui --raw eval "$(cat gates.js)"         options from window.ATLAS_GATES
 *   playwright-cli -s=ui run-code --filename=gates.js          the page is handed in; same thing
 *   Claude_Browser javascript_tool, chrome-devtools evaluate_script:  (<this file>)({ kind: 'persuade' })
 *
 * Options: { kind: 'persuade'|'operate'|'read'|'experience', screen: 'phone'|'tablet'|'desktop'|'wide'
 * (taken from the width when absent), touch: true|false, stepWait: ms per scroll step (350),
 * wait: ms after the last step (1000), limits: { any limit below, by name } }.
 *
 * It returns { verdict, gates, notMeasured, text }: `text` holds one PASS, FAIL or SKIP line per
 * gate with its number and its limit. It never throws: a gate that breaks on an odd page says
 * ERROR and the verdict becomes INCOMPLETE. It scrolls the page once from top to bottom (that is
 * how a reveal that never fires is caught) and puts the scroll back where it was.
 *
 * Limits are the rules of a11y.md, taste.md and polish.md; the persuade ones follow the type
 * scale for pages in taste.md and the composition of page.md. The idea of a script of rendered
 * gates with fixed limits after pbakaus/impeccable (Apache-2.0) and Leonxlnx/taste-skill (MIT);
 * these gates and this code are ours.
 */
async function atlasGates(arg) {
  // Inside run-code the argument is the Playwright page: send this same function into the page.
  if (arg && typeof arg.evaluate === 'function') return arg.evaluate(atlasGates, null);

  const opt = Object.assign({}, (typeof window !== 'undefined' && window.ATLAS_GATES) || {}, arg && typeof arg === 'object' ? arg : {});
  // The visual viewport: on a phone a page that overflows widens innerWidth and innerHeight to
  // what it zoomed out to, while the screen stays the screen.
  const vv = window.visualViewport;
  const W = Math.round(vv ? vv.width * vv.scale : window.innerWidth), H = Math.round(vv ? vv.height * vv.scale : window.innerHeight);
  const VW = document.documentElement.clientWidth || W; // without a classic scrollbar
  // The layout viewport, in which element rects and elementFromPoint live.
  const LW = window.innerWidth, LH = window.innerHeight;
  const screen = opt.screen || (W <= 480 ? 'phone' : W < 1024 ? 'tablet' : W >= 1600 ? 'wide' : 'desktop');
  const touch = opt.touch != null ? !!opt.touch : (screen === 'phone' || matchMedia('(pointer: coarse)').matches);
  const persuade = opt.kind === 'persuade';
  const L = Object.assign({
    overflowPx: 0, clipped: 0,
    target: touch ? 44 : 24, targetGap: 8, imgUnsized: 0, headingSkips: 0, h1Count: 1,
    contrast: 4.5, contrastLarge: 3, measure: 75, lineHeight: 1.4,
    bodyMin: persuade ? 16 : 14, controlMin: 12, inputMinTouch: 16, anyMin: 12, headingRatio: 1.25,
    boxInsetX: 8, boxInsetY: 4, screenInset: 16, covered: 0, unrevealed: 0,
    // persuade only
    h1Min: W >= 1024 ? 56 : W <= 480 ? 36 : 44, h1Ratio: W >= 1024 ? 2.5 : 2,
    h1Step: W >= 1024 ? 1.3 : 1.2, h1Lines: W >= 1024 ? 2 : 3, firstActions: 2,
    sameGroundRun: 2, filledPerSection: 1, wideText: 1280, wideFrom: 1600,
  }, opt.limits || {});
  const stepWait = opt.stepWait ?? 350, finalWait = opt.wait ?? 1000, MAXN = 6000, EX = 5;

  const gates = [], notMeasured = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const gate = (id, fn) => {
    try {
      const g = fn();
      gates.push(Object.assign({ id }, g));
    } catch (e) {
      gates.push({ id, status: 'ERROR', value: null, limit: null, detail: String(e && e.message || e).slice(0, 160) });
    }
  };

  if (!document.body) return { verdict: 'INCOMPLETE', gates: [], notMeasured: ['no body: nothing rendered'], text: 'ERROR  no document body' };

  // ---- helpers ------------------------------------------------------------------------------
  const styles = new Map();
  const st = (el) => { let s = styles.get(el); if (!s) styles.set(el, s = getComputedStyle(el)); return s; };
  const px = (v) => parseFloat(v) || 0;

  // Colours come back in any syntax (rgb, oklch, color()); a 1x1 canvas resolves them all.
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgbaCache = new Map();
  const rgba = (c) => {
    if (rgbaCache.has(c)) return rgbaCache.get(c);
    let out;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(c || '');
    if (m) out = { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : m[4].endsWith('%') ? px(m[4]) / 100 : +m[4] };
    else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'transparent'; cx.fillStyle = c || 'transparent'; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    rgbaCache.set(c, out); return out;
  };
  const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const darkCanvas = /dark/.test(st(document.documentElement).colorScheme || '') && matchMedia('(prefers-color-scheme: dark)').matches;
  const CANVAS = darkCanvas ? { r: 18, g: 18, b: 18, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };

  const short = (s, n = 40) => { s = (s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const desc = (el) => {
    if (!el || !el.tagName) return String(el);
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');
    const txt = short(el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || el.getAttribute('src') || '', 32);
    return `${t}${id}${txt ? ` "${txt}"` : ''}`;
  };
  // A computed style is live, so the cache above stays true while a reveal animates.
  const opacityOf = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const v = parseFloat(st(n).opacity); o *= isNaN(v) ? 1 : v; } return o; };
  const posAncestor = (el, set) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (set.has(st(n).position)) return n; return null; };
  const ABSFIX = new Set(['absolute', 'fixed']), FIXSTICKY = new Set(['fixed', 'sticky']);

  // Every element that owns text directly, with its text nodes.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'OPTION', 'TITLE']);
  const texts = new Map(); let capped = false;
  {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest('svg')) continue;
      let e = texts.get(p);
      if (!e) { if (texts.size >= MAXN) { capped = true; break; } texts.set(p, e = { nodes: [], text: '' }); }
      e.nodes.push(n); e.text += n.nodeValue;
    }
    for (const e of texts.values()) e.text = e.text.replace(/\s+/g, ' ').trim();
  }
  if (capped) notMeasured.push(`only the first ${MAXN} text elements were measured`);
  if (!texts.size) notMeasured.push('no text in the document: the text gates passed on nothing (an empty state, a page not loaded, or text drawn on a canvas)');
  const canvases = document.querySelectorAll('canvas').length;
  if (canvases) notMeasured.push(`${canvases} canvas: what it draws is pixels, not measured here (3d.md has its checks)`);
  const range = document.createRange();
  const textRect = (el) => {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const n of texts.get(el).nodes) {
      range.selectNodeContents(n);
      const q = range.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    return l === Infinity ? null : { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  };
  // The part of the text the eye can see: cut by every ancestor that hides its overflow, so a
  // clipped text is judged on what is left of it, not on the lines nobody sees.
  const seenRect = (el) => {
    const r = textRect(el); if (!r) return null;
    let { left, top, right, bottom } = r;
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const s = st(n);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      // Overflow is cut at the padding box, inside the border.
      const q = n.getBoundingClientRect(), x0 = q.left + n.clientLeft, y0 = q.top + n.clientTop;
      if (s.overflowX !== 'visible') { left = Math.max(left, x0); right = Math.min(right, x0 + n.clientWidth); }
      if (s.overflowY !== 'visible') { top = Math.max(top, y0); bottom = Math.min(bottom, y0 + n.clientHeight); }
    }
    return right - left < 1 || bottom - top < 1 ? null : { left, top, right, bottom, width: right - left, height: bottom - top };
  };
  // Shown at all: not display none, not visibility hidden, not shrunk to a screen-reader pixel.
  const shown = (el) => { const s = st(el); if (s.visibility !== 'visible' || s.display === 'none') return false; const r = textRect(el); return !!r && r.width > 1 && r.height > 1; };
  const HIDDEN_ON_PURPOSE = 'nav, dialog:not([open]), [role=dialog], [role=menu], [role=listbox], [role=tooltip], [aria-hidden=true], [hidden], [inert], details:not([open])';

  // The ground behind a text, in paint order when it is on screen, by its ancestors otherwise.
  const MEDIA = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'PICTURE', 'OBJECT', 'EMBED']);
  const groundAt = (el, rect) => {
    let stack = null;
    if (rect) {
      const x = Math.min(LW - 1, Math.max(0, (rect.left + rect.right) / 2)), y = Math.min(LH - 1, Math.max(0, (rect.top + rect.bottom) / 2));
      if (rect.top >= 0 && rect.bottom <= LH) {
        const all = document.elementsFromPoint(x, y), i = all.indexOf(el);
        if (i >= 0) stack = all.slice(i);
      }
    }
    if (!stack) { stack = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) stack.push(n); }
    const layers = [];
    for (const n of stack) {
      if (n !== el && MEDIA.has(n.tagName)) return { unknown: 'over ' + n.tagName.toLowerCase() };
      if (n instanceof SVGElement && n.tagName.toLowerCase() === 'svg' && n !== el) return { unknown: 'over svg' };
      const s = st(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return { unknown: 'over a gradient or image' };
      if (s.backdropFilter && s.backdropFilter !== 'none') return { unknown: 'over a backdrop filter' };
      const c = rgba(s.backgroundColor);
      if (c.a > 0) { layers.push(c); if (c.a >= 0.999) break; }
    }
    let g = CANVAS;
    for (let i = layers.length - 1; i >= 0; i--) g = blend(layers[i], g);
    return { color: g };
  };
  const isLarge = (s) => px(s.fontSize) >= 24 || (px(s.fontSize) >= 18.66 && (parseInt(s.fontWeight, 10) || 400) >= 700);
  const contrastOf = (el, rect) => {
    const s = st(el);
    if (s.webkitTextFillColor && rgba(s.webkitTextFillColor).a === 0) return { unknown: 'text filled with a gradient' };
    if (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text') return { unknown: 'text filled with a gradient' };
    const g = groundAt(el, rect); if (g.unknown) return g;
    const fg = rgba(s.color); const a = fg.a * opacityOf(el);
    if (a <= 0) return { unknown: 'transparent text' };
    const r = ratio(blend({ ...fg, a }, g.color), g.color);
    return { ratio: r, need: isLarge(s) ? L.contrastLarge : L.contrast };
  };

  try { await Promise.race([document.fonts && document.fonts.ready, sleep(3000)]); } catch (e) { /* no font API: measured with what is there */ }

  // ---- at the top, before any scroll --------------------------------------------------------
  const startY = window.scrollY, startX = window.scrollX;
  window.scrollTo(0, 0); await sleep(50);

  gate('overflow-x', () => {
    const de = document.documentElement, over = Math.max(de.scrollWidth, document.body.scrollWidth) - de.clientWidth;
    const ex = [];
    if (over > L.overflowPx) for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 && r.width > 0 && !posAncestor(el, new Set(['fixed']))) { ex.push(`${desc(el)} right edge ${Math.round(r.right)}`); if (ex.length >= EX) break; }
    }
    const masked = [st(de).overflowX, st(document.body).overflowX].some((v) => v === 'hidden' || v === 'clip');
    return { status: over > L.overflowPx ? 'FAIL' : 'PASS', value: over, limit: L.overflowPx, unit: 'px past the viewport', examples: ex,
      detail: masked ? 'html or body hides sideways overflow: what it cuts is counted by clipped-text' : undefined };
  });

  const h1 = [...document.querySelectorAll('h1, [role=heading][aria-level="1"]')].find((e) => texts.has(e) ? shown(e) : e.getClientRects().length);
  if (persuade) {
    gate('first-screen-actions', () => {
      if (!h1) return { status: 'FAIL', value: null, limit: H, detail: 'no h1 to find the first screen by' };
      const band = h1.closest('section, header, [role=banner], main > *, body > *') || document.body;
      const acts = [...band.querySelectorAll('a[href], button, [role=button], input[type=submit]')].filter((a) => {
        if (a.closest('nav')) return false;
        const s = st(a), r = a.getBoundingClientRect();
        const boxed = rgba(s.backgroundColor).a > 0.3 || (px(s.borderTopWidth) > 0 && rgba(s.borderTopColor).a > 0.3);
        return boxed && r.width > 0 && r.height > 0 && s.visibility === 'visible';
      });
      if (!acts.length) return { status: 'FAIL', value: null, limit: H, detail: 'no button-like action in the band of the h1' };
      const low = Math.max(...acts.map((a) => a.getBoundingClientRect().bottom));
      const ok = low <= H && acts.length <= L.firstActions;
      return { status: ok ? 'PASS' : 'FAIL', value: Math.round(low), limit: `${H} px, ${L.firstActions} actions`, unit: 'px, lowest action bottom against the viewport height',
        detail: `${acts.length} action${acts.length === 1 ? '' : 's'} in the first band`, examples: acts.filter((a) => a.getBoundingClientRect().bottom > H).slice(0, EX).map(desc) };
    });
  }

  // ---- one scroll from top to bottom: covered text, reveals, contrast in paint order ---------
  const seenVisible = new Set(), seenHidden = new Set(), contrastBest = new Map(), covered = new Map();
  const inView = (r) => r && r.top >= 0 && r.bottom <= LH && r.left >= 0 && r.right <= LW;
  const visit = () => {
    const scrolled = window.scrollY > 0;
    for (const el of texts.keys()) {
      const s = st(el);
      if (s.display === 'none') continue;
      const r = seenRect(el);
      if (!inView(r) || r.width <= 1 || r.height <= 1) continue;
      const o = opacityOf(el), vis = st(el).visibility === 'visible';
      if (o < 0.05 || !vis) { if (!seenVisible.has(el)) seenHidden.add(el); continue; }
      seenVisible.add(el); seenHidden.delete(el);
      const c = contrastOf(el, r), prev = contrastBest.get(el);
      if (!prev || (c.ratio != null && (prev.ratio == null || o >= prev.o))) contrastBest.set(el, Object.assign(c, { o }));
      // Covered: something unrelated on top of the text's middle, or of two of its three points.
      const y = (r.top + r.bottom) / 2, pts = [(r.left + r.right) / 2, r.left + r.width * 0.2, r.right - r.width * 0.2];
      let hits = 0, by = null, centre = false;
      pts.forEach((x, i) => {
        const top = document.elementFromPoint(x, y);
        if (!top || el.contains(top) || top.contains(el)) return;
        if (scrolled && posAncestor(top, FIXSTICKY)) return; // a sticky bar over content while scrolling is by design
        hits++; by = top; if (i === 0) centre = true;
      });
      if (centre || hits >= 2) { if (!covered.has(el)) covered.set(el, by); } else covered.delete(el);
    }
  };
  const docH = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  let steps = 0;
  for (let y = 0; steps < 40; y += Math.round(H * 0.8), steps++) {
    window.scrollTo(0, y); await sleep(stepWait); visit();
    if (y + H >= docH()) break;
  }
  await sleep(finalWait); visit();
  if (steps >= 40) notMeasured.push('page longer than 40 scroll steps: the rest was not scrolled through');
  if (docH() <= H + 1 && [...texts.keys()].some((el) => { const r = textRect(el); return r && r.top > H; }))
    notMeasured.push('the window does not scroll (an inner container does): text below the first screen was not checked for covering or reveal');

  // ---- measured on the final state ----------------------------------------------------------
  const visibleTexts = [...texts.keys()].filter((el) => shown(el) && opacityOf(el) >= 0.05);

  gate('clipped-text', () => {
    const bad = [], deliberate = [];
    for (const el of document.body.querySelectorAll('*')) {
      const s = st(el);
      const hx = s.overflowX === 'hidden' || s.overflowX === 'clip', hy = s.overflowY === 'hidden' || s.overflowY === 'clip';
      if (!hx && !hy) continue;
      if (!el.textContent.trim() || s.display === 'none' || s.visibility !== 'visible') continue;
      if (el.clientWidth <= 2 || el.clientHeight <= 2) continue; // a screen-reader-only box
      const cutX = hx && el.scrollWidth > el.clientWidth + 1, cutY = hy && el.scrollHeight > el.clientHeight + 1;
      if (!cutX && !cutY) continue;
      if (s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none')) { deliberate.push(desc(el)); continue; }
      // Cut only when text sits in the hidden part, not a decoration or a slide off to the side.
      const box = el.getBoundingClientRect();
      const lost = [...el.querySelectorAll('*'), el].some((d) => {
        if (!texts.has(d)) return false;
        const r = textRect(d);
        return r && ((cutX && (r.right > box.right + 1 || r.left < box.left - 1) && r.top < box.bottom && r.bottom > box.top) || (cutY && r.bottom > box.bottom + 1 && r.top < box.bottom));
      });
      if (lost) bad.push(`${desc(el)} ${cutX ? `${el.scrollWidth - el.clientWidth} px wide` : ''}${cutY ? ` ${el.scrollHeight - el.clientHeight} px tall` : ''} cut`);
    }
    return { status: bad.length > L.clipped ? 'FAIL' : 'PASS', value: bad.length, limit: L.clipped, unit: 'boxes cutting their text', examples: bad.slice(0, EX),
      detail: deliberate.length ? `${deliberate.length} truncated on purpose (ellipsis or line clamp): check each has a way to the full value` : undefined };
  });

  gate('targets', () => {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=tab], [role=switch], [role=menuitem], [tabindex]:not([tabindex="-1"])';
    const list = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.disabled || el.closest('[aria-hidden=true], [inert]')) continue;
      if ((el.type === 'checkbox' || el.type === 'radio') && el.labels && el.labels.length) continue; // the label is the target
      const s = st(el), r = el.getBoundingClientRect();
      if (s.visibility !== 'visible' || r.width < 1 || r.height < 1) continue;
      // A link inside a sentence is exempt (2.5.8, inline).
      const p = el.parentElement;
      const inline = el.tagName === 'A' && s.display.startsWith('inline') && p && p.textContent.trim().length > el.textContent.trim().length + 10;
      list.push({ el, r, inline, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 });
    }
    if (list.length > 800) notMeasured.push(`targets: ${list.length} controls, spacing checked on the first 800`);
    const pool = list.slice(0, 800), small = [], close = [];
    for (const t of pool) {
      if (t.inline) continue;
      if (t.r.width >= L.target && t.r.height >= L.target) continue;
      // Undersized passes with a pointer when nothing else sits within the minimum around it (2.5.8 spacing).
      const crowded = pool.some((o) => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el) && Math.hypot(o.cx - t.cx, o.cy - t.cy) < L.target);
      if (touch || crowded) small.push(`${desc(t.el)} ${Math.round(t.r.width)}x${Math.round(t.r.height)}`);
    }
    if (touch) for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      if (a.inline || b.inline || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const gx = Math.max(a.r.left - b.r.right, b.r.left - a.r.right), gy = Math.max(a.r.top - b.r.bottom, b.r.top - a.r.bottom);
      const gap = Math.max(gx, gy);
      if (gap < L.targetGap) close.push(`${desc(a.el)} and ${desc(b.el)} ${Math.max(0, Math.round(gap))} px apart`);
    }
    const n = small.length + close.length;
    return { status: n ? 'FAIL' : 'PASS', value: n, limit: 0, unit: `targets under ${L.target} px${touch ? ` or closer than ${L.targetGap} px` : ''}`,
      examples: small.concat(close).slice(0, EX), detail: `${pool.length} targets; a hit area widened by a pseudo-element is not seen here` };
  });

  gate('image-space', () => {
    const bad = [...document.querySelectorAll('img, video')].filter((el) => {
      if (st(el).display === 'none') return false;
      const attrs = el.hasAttribute('width') && el.hasAttribute('height');
      const ar = st(el).aspectRatio;
      return !attrs && (!ar || ar === 'auto');
    });
    return { status: bad.length > L.imgUnsized ? 'FAIL' : 'PASS', value: bad.length, limit: L.imgUnsized, unit: 'images with no width and height or aspect-ratio', examples: bad.slice(0, EX).map(desc) };
  });

  gate('headings', () => {
    const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]')].filter((h) => st(h).display !== 'none' && !h.closest('[aria-hidden=true], [hidden]'));
    let prev = 0; const skips = [];
    for (const h of hs) {
      const lv = h.getAttribute('role') === 'heading' ? parseInt(h.getAttribute('aria-level'), 10) || 2 : +h.tagName[1];
      if (prev && lv > prev + 1) skips.push(`h${prev} then h${lv} at ${desc(h)}`);
      prev = lv;
    }
    const ones = hs.filter((h) => h.tagName === 'H1' || h.getAttribute('aria-level') === '1').length;
    const fail = skips.length > L.headingSkips || ones !== L.h1Count;
    return { status: fail ? 'FAIL' : 'PASS', value: skips.length, limit: L.headingSkips, unit: 'levels skipped', examples: skips.slice(0, EX),
      detail: `${ones} h1 (limit ${L.h1Count}), ${hs.length} headings` };
  });

  gate('contrast', () => {
    const bad = [], unknown = {};
    let n = 0;
    for (const el of visibleTexts) {
      if (el.closest('[disabled], [aria-disabled=true]')) continue;
      let c = contrastBest.get(el);
      if (!c) c = contrastOf(el, null); // never on screen during the scroll: ground by ancestors
      if (c.unknown) { unknown[c.unknown] = (unknown[c.unknown] || 0) + 1; continue; }
      n++;
      if (c.ratio < c.need - 0.005) bad.push({ r: c.ratio, s: `${desc(el)} ${c.ratio.toFixed(2)}:1, needs ${c.need}` });
    }
    bad.sort((a, b) => a.r - b.r);
    const u = Object.entries(unknown).map(([k, v]) => `${v} ${k}`);
    if (u.length) notMeasured.push(`contrast not computed for ${u.join(', ')}: look at those on the screenshot`);
    return { status: bad.length ? 'FAIL' : 'PASS', value: bad.length ? +bad[0].r.toFixed(2) : null, limit: `${L.contrast} (large ${L.contrastLarge})`,
      unit: bad.length ? `worst ratio; ${bad.length} of ${n} texts under their tier` : `${n} texts measured`, examples: bad.slice(0, EX).map((b) => b.s) };
  });

  // Running text: paragraphs and their kin, not labels, headings, code or the fine print.
  const RUN = new Set(['P', 'LI', 'DD', 'BLOCKQUOTE', 'TD']);
  const running = visibleTexts.filter((el) => {
    if (el.closest('h1, h2, h3, h4, h5, h6, [role=heading], button, a, label, pre, code, footer, small, figcaption, caption, nav, sup, sub')) return false;
    const t = texts.get(el).text;
    return (RUN.has(el.tagName) && t.length >= 40) || t.length >= 80;
  });
  const linesOf = (el, r) => { const s = st(el); const lh = s.lineHeight === 'normal' ? px(s.fontSize) * 1.2 : px(s.lineHeight); return Math.max(1, Math.round(r.height / (lh || 1))); };
  const charW = (el) => {
    const s = st(el);
    cx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const sample = texts.get(el).text.slice(0, 200);
    return sample.length ? cx.measureText(sample).width / sample.length : px(s.fontSize) / 2;
  };

  gate('measure', () => {
    const bad = []; let worst = 0;
    for (const el of running) {
      const r = textRect(el); const lines = linesOf(el, r);
      const chars = lines >= 2 ? r.width / charW(el) : texts.get(el).text.length;
      worst = Math.max(worst, chars);
      if (chars > L.measure) bad.push(`${desc(el)} ${Math.round(chars)} characters a line`);
    }
    return { status: bad.length ? 'FAIL' : 'PASS', value: Math.round(worst), limit: L.measure, unit: 'characters a line, longest', examples: bad.slice(0, EX), detail: `${running.length} blocks of running text` };
  });

  gate('line-height', () => {
    const bad = []; let low = Infinity;
    for (const el of running) {
      const s = st(el), fs = px(s.fontSize);
      if (fs >= 24 || linesOf(el, textRect(el)) < 2) continue;
      const lh = s.lineHeight === 'normal' ? 1.2 : px(s.lineHeight) / fs;
      low = Math.min(low, lh);
      if (lh < L.lineHeight - 0.005) bad.push(`${desc(el)} ${lh.toFixed(2)}`);
    }
    return { status: bad.length ? 'FAIL' : 'PASS', value: low === Infinity ? null : +low.toFixed(2), limit: L.lineHeight, unit: 'line height of running text, lowest', examples: bad.slice(0, EX) };
  });

  // The body size: the size most of the running text is set in, weighted by its length.
  const bodySize = (() => {
    const w = new Map();
    for (const el of running) { const f = Math.round(px(st(el).fontSize) * 10) / 10; w.set(f, (w.get(f) || 0) + texts.get(el).text.length); }
    let best = px(st(document.body).fontSize) || 16, max = 0;
    for (const [f, n] of w) if (n > max) { max = n; best = f; }
    return best;
  })();

  gate('text-size', () => {
    const bad = [];
    for (const el of running) { const f = px(st(el).fontSize); if (f < L.bodyMin) bad.push(`${desc(el)} body ${f} px (limit ${L.bodyMin})`); }
    for (const el of document.querySelectorAll('button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, label')) {
      const s = st(el), r = el.getBoundingClientRect();
      if (s.visibility !== 'visible' || r.width < 2) continue;
      const f = px(s.fontSize), field = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
      if (!field && (!el.textContent.trim() || f === 0)) continue; // an icon control named by aria-label shows no text
      if (f < L.controlMin) bad.push(`${desc(el)} control ${f} px (limit ${L.controlMin})`);
      else if (touch && field && f < L.inputMinTouch) bad.push(`${desc(el)} field ${f} px on touch: the phone zooms in (limit ${L.inputMinTouch})`);
    }
    let least = Infinity;
    for (const el of visibleTexts) {
      if (el.closest('sup, sub')) continue;
      const f = px(st(el).fontSize); least = Math.min(least, f);
      if (f < L.anyMin) bad.push(`${desc(el)} ${f} px (limit ${L.anyMin})`);
    }
    return { status: bad.length ? 'FAIL' : 'PASS', value: least === Infinity ? null : least, limit: `${L.anyMin} any, ${L.bodyMin} body, ${L.controlMin} controls${touch ? `, ${L.inputMinTouch} fields` : ''}`,
      unit: `px smallest; body is ${bodySize} px`, examples: [...new Set(bad)].slice(0, EX) };
  });

  gate('heading-ratio', () => {
    const hs = [...document.querySelectorAll('h1, h2, [role=heading][aria-level="1"], [role=heading][aria-level="2"]')].filter((h) => st(h).display !== 'none' && h.getClientRects().length);
    if (!hs.length) return { status: 'SKIP', value: null, limit: L.headingRatio, detail: 'no h1 or h2 shown' };
    const top = Math.max(...hs.map((h) => px(st(h).fontSize)));
    const r = top / bodySize;
    return { status: r >= L.headingRatio - 0.005 ? 'PASS' : 'FAIL', value: +r.toFixed(2), limit: L.headingRatio, unit: `largest heading ${top} px over body ${bodySize} px` };
  });

  gate('text-inset', () => {
    const box = [], edge = [];
    for (const el of visibleTexts) {
      const r = seenRect(el), whole = textRect(el); if (!r) continue;
      if (whole && (whole.height - r.height > 1 || whole.width - r.width > 1)) continue; // cut: clipped-text has it
      // The nearest painted box around the text: a fill, a border or a shadow.
      let b = null;
      for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        const s = st(n);
        const clippedToText = s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text';
        const fill = !clippedToText && (rgba(s.backgroundColor).a > 0.1 || (s.backgroundImage && s.backgroundImage !== 'none'));
        const line = ['Top', 'Right', 'Bottom', 'Left'].some((k) => px(s[`border${k}Width`]) > 0 && rgba(s[`border${k}Color`]).a > 0.1);
        if (fill || line || (s.boxShadow && s.boxShadow !== 'none')) { b = n; break; }
      }
      if (b && st(b).display !== 'inline') {
        const q = b.getBoundingClientRect(), s = st(b);
        if (q.width < VW - 2) { // a full-width band is the screen edge's business
          const dx = Math.min(r.left - q.left - px(s.borderLeftWidth), q.right - px(s.borderRightWidth) - r.right);
          const dy = Math.min(r.top - q.top - px(s.borderTopWidth), q.bottom - px(s.borderBottomWidth) - r.bottom);
          if (dx < L.boxInsetX || dy < L.boxInsetY) box.push(`${desc(el)} ${Math.round(dx)} px across, ${Math.round(dy)} px down from the edge of ${desc(b)}`);
        }
      }
      if (r.right > 0 && r.left < VW && !posAncestor(el, new Set(['fixed'])) && (r.left < L.screenInset || r.right > VW - L.screenInset))
        edge.push(`${desc(el)} ${Math.round(Math.min(r.left, VW - r.right))} px from the screen edge`);
    }
    const n = box.length + edge.length;
    return { status: n ? 'FAIL' : 'PASS', value: n, limit: 0, unit: `texts nearer than ${L.boxInsetX} px across or ${L.boxInsetY} px down to their box, or ${L.screenInset} px to the screen`, examples: box.concat(edge).slice(0, EX) };
  });

  gate('covered-text', () => {
    const list = [...covered].filter(([el]) => shown(el)).map(([el, by]) => `${desc(el)} under ${desc(by)}`);
    return { status: list.length > L.covered ? 'FAIL' : 'PASS', value: list.length, limit: L.covered, unit: 'texts with another element on top', examples: list.slice(0, EX) };
  });

  gate('unrevealed', () => {
    const list = [...seenHidden].filter((el) => !seenVisible.has(el) && !el.closest(HIDDEN_ON_PURPOSE) && !posAncestor(el, ABSFIX) && st(el).display !== 'none');
    const chars = list.reduce((n, el) => n + texts.get(el).text.length, 0);
    return { status: list.length > L.unrevealed ? 'FAIL' : 'PASS', value: list.length, limit: L.unrevealed, unit: `texts still invisible after the scroll and ${finalWait} ms (${chars} characters)`, examples: list.slice(0, EX).map(desc) };
  });

  // ---- persuade: the page, not the component ------------------------------------------------
  if (persuade) {
    gate('h1-size', () => {
      if (!h1) return { status: 'FAIL', value: null, limit: L.h1Min, detail: 'no h1' };
      const s = st(h1), f = px(s.fontSize), r = f / bodySize;
      const h2s = [...document.querySelectorAll('h2')].filter((h) => h.getClientRects().length).map((h) => px(st(h).fontSize));
      const step = h2s.length ? f / Math.max(...h2s) : null;
      const lh = s.lineHeight === 'normal' ? f * 1.2 : px(s.lineHeight);
      const lines = Math.round(h1.getBoundingClientRect().height / (lh || f));
      const why = [];
      if (f < L.h1Min) why.push(`under ${L.h1Min} px`);
      if (r < L.h1Ratio - 0.005) why.push(`under ${L.h1Ratio}x body`);
      if (step != null && step < L.h1Step - 0.005) why.push(`only ${step.toFixed(2)}x the section heading (limit ${L.h1Step})`);
      if (lines > L.h1Lines) why.push(`${lines} lines (limit ${L.h1Lines})`);
      return { status: why.length ? 'FAIL' : 'PASS', value: f, limit: `${L.h1Min} px, ${L.h1Ratio}x body, ${L.h1Step}x h2, ${L.h1Lines} lines at ${W} wide`,
        unit: `px, ${r.toFixed(2)}x body${step != null ? `, ${step.toFixed(2)}x h2` : ''}, ${lines} line${lines === 1 ? '' : 's'}`, detail: why.join(', ') || undefined };
    });

    const main = document.querySelector('main');
    const pick = (root) => [...root.children].filter((c) => !/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(c.tagName) && c.getBoundingClientRect().height >= 80 && st(c).display !== 'none');
    let sections = main ? pick(main) : [];
    if (sections.length < 2) sections = pick(document.body).flatMap((c) => (c.tagName === 'MAIN' ? pick(c) : [c]));
    const groundKey = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = st(n);
        if (s.backgroundImage && s.backgroundImage !== 'none') return 'image ' + (n === el ? short(s.backgroundImage, 60) : desc(n));
        const c = rgba(s.backgroundColor);
        if (c.a > 0.5) return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
      }
      return 'canvas';
    };

    gate('same-ground-run', () => {
      if (sections.length < 3) return { status: 'SKIP', value: sections.length, limit: L.sameGroundRun, detail: 'fewer than 3 sections found under main or body' };
      let run = 1, worst = 1, at = 0;
      const keys = sections.map(groundKey);
      for (let i = 1; i < keys.length; i++) { run = keys[i] === keys[i - 1] ? run + 1 : 1; if (run > worst) { worst = run; at = i; } }
      return { status: worst > L.sameGroundRun ? 'FAIL' : 'PASS', value: worst, limit: L.sameGroundRun, unit: `sections in a row on one ground, of ${sections.length}`,
        examples: worst > L.sameGroundRun ? [`${keys[at]} from ${desc(sections[at - worst + 1])} to ${desc(sections[at])}`] : [] };
    });

    gate('filled-per-section', () => {
      const bad = [];
      for (const sec of sections) {
        const g = rgba(groundKey(sec).startsWith('rgb') ? groundKey(sec) : 'transparent');
        const filled = [...sec.querySelectorAll('a[href], button, [role=button], input[type=submit]')].filter((a) => {
          if (a.closest('nav')) return false;
          const s = st(a), c = rgba(s.backgroundColor), r = a.getBoundingClientRect();
          // A button with a word on it; an icon control is not what competes for the action.
          if (s.visibility !== 'visible' || r.width < 1 || c.a < 0.5 || a.textContent.trim().length < 2 || px(s.fontSize) === 0) return false;
          return Math.abs(c.r - g.r) + Math.abs(c.g - g.g) + Math.abs(c.b - g.b) > 30 || g.a === 0;
        });
        const labels = new Set(filled.map((a) => short(a.textContent, 24)));
        if (filled.length > L.filledPerSection) bad.push(`${desc(sec)} ${filled.length} filled: ${[...labels].join(' / ')}`);
      }
      return { status: bad.length ? 'FAIL' : 'PASS', value: bad.length, limit: `${L.filledPerSection} filled button a section`, unit: `sections over, of ${sections.length}`, examples: bad.slice(0, EX) };
    });
  }

  gate('wide-text', () => {
    if (W < L.wideFrom) return { status: 'SKIP', value: W, limit: L.wideText, detail: `needs a viewport of ${L.wideFrom} or more; this one is ${W}` };
    const bad = []; let widest = 0;
    for (const el of visibleTexts) {
      if (!/^(P|LI|H[1-6]|BLOCKQUOTE|DD)$/.test(el.tagName)) continue;
      const r = textRect(el); widest = Math.max(widest, r.width);
      if (r.width > L.wideText) bad.push(`${desc(el)} ${Math.round(r.width)} px`);
    }
    return { status: bad.length ? 'FAIL' : 'PASS', value: Math.round(widest), limit: L.wideText, unit: 'px, widest text block', examples: bad.slice(0, EX) };
  });

  window.scrollTo(startX, startY);
  notMeasured.push('console errors, the keyboard walk, states other than this one, and anything a hit area adds beyond the box: not measurable from here');
  const fails = gates.filter((g) => g.status === 'FAIL').length, errs = gates.filter((g) => g.status === 'ERROR').length;
  const verdict = fails ? 'FAIL' : errs ? 'INCOMPLETE' : 'PASS';
  const fmt = (v) => (v == null ? '-' : v);
  const lines = gates.map((g) => `${g.status.padEnd(5)} ${g.id.padEnd(21)} ${fmt(g.value)} ${g.unit || ''} (limit ${fmt(g.limit)})${g.detail ? `; ${g.detail}` : ''}${g.examples && g.examples.length ? `\n        ${g.examples.join('\n        ')}` : ''}`);
  const head = `gates ${verdict}: ${fails} failing of ${gates.length}, ${W}x${H} ${screen}${touch ? ' touch' : ''}${opt.kind ? ` ${opt.kind}` : ''}, ${location.href}`;
  return { verdict, viewport: { width: W, height: H, dpr: window.devicePixelRatio, screen, touch, kind: opt.kind || null }, gates, notMeasured,
    text: [head, ...lines, ...notMeasured.map((n) => `not    ${n}`)].join('\n') };
}
