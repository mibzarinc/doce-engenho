// Utilitários de interface: formatação, ícones, toasts e janelas (modais).

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (n) => fmtBRL.format(Number.isFinite(n) ? n : 0);

/** Custo unitário: valores pequenos (ex.: R$ 0,0099 por m de linha) ganham mais casas. */
const fmtBRL4 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const brlUnit = (n) => (n > 0 && n < 1 ? fmtBRL4.format(n) : brl(n));

/** Número em formato brasileiro (vírgula decimal), sem zeros desnecessários. */
export const num = (n, max = 2) => (Number.isFinite(n) ? n : 0)
  .toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: max });

/** Número com casas fixas — usado em campos de dinheiro. */
export const fixo = (n, d = 2) => (Number.isFinite(n) ? n : 0)
  .toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Aceita "12,50", "12.50", "1.234,56" e devolve número (ou 0). */
export function parseNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/[R$\s%]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function fmtTempo(min) {
  min = Math.round(min || 0);
  const h = Math.floor(min / 60), m = min % 60;
  if (!h && !m) return '0 min';
  if (!h) return `${m} min`;
  return m ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
}

export function fmtData(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function debounce(fn, ms = 400) {
  let t = null;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, ms); };
  d.flush = () => { if (t) { clearTimeout(t); t = null; fn(); } }; // só se houver algo pendente
  return d;
}

/* ---------------- Ícones (traço, 24×24) ---------------- */
const PATHS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  box: '<path d="M3 7.5 12 3l9 4.5-9 4.5z"/><path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>',
  alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.1"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  weight: '<path d="M6.5 8h11l2.5 12H4z"/><circle cx="12" cy="5.5" r="2.5"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;
}

/* ---------------- Ilustração (ursinho) para produtos sem foto ---------------- */
const PH_CORES = [
  ['#C9646B', '#FBEDEC'], ['#5F8C6F', '#EAF2EC'], ['#C98A2E', '#FBF1DF'], ['#7E58B0', '#F1EBF8'], ['#B0704A', '#F7EBE2'],
];
export function teddy() {
  return `<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <circle cx="27" cy="28" r="13"/><circle cx="73" cy="28" r="13"/>
    <circle cx="27" cy="28" r="6.5" fill="#fff" opacity=".45"/><circle cx="73" cy="28" r="6.5" fill="#fff" opacity=".45"/>
    <circle cx="50" cy="55" r="34"/>
    <ellipse cx="50" cy="66" rx="15" ry="11.5" fill="#fff" opacity=".5"/>
    <circle cx="38" cy="50" r="4" fill="#3B2F2A"/><circle cx="62" cy="50" r="4" fill="#3B2F2A"/>
    <ellipse cx="50" cy="61" rx="5.5" ry="4" fill="#3B2F2A"/>
    <path d="M44 70q6 5 12 0" stroke="#3B2F2A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </svg>`;
}
export function placeholder(seed = '') {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [cor, bg] = PH_CORES[h % PH_CORES.length];
  return `<div class="ph" style="--ph:${cor};--ph-bg:${bg}">${teddy()}</div>`;
}

/* ---------------- Toast ---------------- */
export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  const area = $('#toast-area');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  area.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  if (action) el.querySelector('button').onclick = () => { onAction?.(); close(); };
  setTimeout(close, action ? Math.max(ms, 5000) : ms);
}

/* ---------------- Modal ---------------- */
/**
 * Abre uma janela. `body` é HTML; `foot` é HTML dos botões.
 * Retorna { el, close, done } — `done` é uma Promise resolvida com o valor passado a close().
 */
export function openModal({ title, body = '', foot = '', wide = false, onOpen } = {}) {
  const root = $('#modal-root');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  root.appendChild(ov);
  const el = ov.querySelector('.modal');
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  // Esc fecha só a janela de cima quando uma abre sobre a outra.
  const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === ov) close(null); };
  function close(value = null) {
    document.removeEventListener('keydown', onKey);
    ov.remove();
    resolve(value);
  }
  document.addEventListener('keydown', onKey);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(null); });
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(null)));
  onOpen?.(el, close);
  return { el, close, done };
}

export function confirmDialog({ title, message, ok = 'Confirmar', danger = false }) {
  const m = openModal({
    title,
    body: `<p class="confirm-msg">${message}</p>`,
    foot: `<button class="btn soft" data-close>Cancelar</button>
           <button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button>`,
    onOpen: (el, close) => {
      const b = el.querySelector('[data-ok]');
      b.addEventListener('click', () => close(true));
      setTimeout(() => b.focus(), 50);
    },
  });
  return m.done.then((v) => v === true);
}

/** Reduz e comprime a foto (tablets geram arquivos enormes). */
export async function comprimirImagem(file, max = 1200, q = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Abre o seletor de arquivo (câmera/galeria no tablet). */
export function escolherArquivo(accept = 'image/*') {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = () => resolve(inp.files?.[0] || null);
    inp.click();
  });
}

/** Seleciona o conteúdo do campo ao tocar — facilita trocar o número. */
export function autoSelect(root) {
  root.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t.matches('input[inputmode="decimal"], input[inputmode="numeric"]')) setTimeout(() => t.select(), 0);
  });
}
