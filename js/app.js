// Ponto de entrada: carrega os dados, navega entre as telas e registra o modo offline.

import { carregar } from './store.js';
import { pedirArmazenamentoPersistente } from './db.js';
import { icon, toast } from './ui.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProduto } from './views/produto.js';
import { renderInsumos } from './views/insumos.js';
import { renderAjustes } from './views/ajustes.js';

let app = document.getElementById('app');
let limpar = null; // função de saída da tela atual (ex.: salvar pendências)

const ROTAS = [
  [/^#\/produto\/([\w-]+)/, 'produtos', (root, m) => renderProduto(root, m[1])],
  [/^#\/insumos/, 'insumos', (root) => renderInsumos(root)],
  [/^#\/ajustes/, 'ajustes', (root) => renderAjustes(root)],
  [/^/, 'produtos', (root) => renderDashboard(root)],
];

/** Cada tela começa num contêiner novo: os ouvintes de eventos da tela anterior vão embora junto. */
function novaTela() {
  const novo = app.cloneNode(false);
  app.replaceWith(novo);
  app = novo;
  return novo;
}

function navegar() {
  limpar?.();
  limpar = null;
  const hash = location.hash || '#/';
  for (const [re, aba, render] of ROTAS) {
    const m = hash.match(re);
    if (!m) continue;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === aba));
    document.getElementById('modal-root').innerHTML = '';
    // "Desfazer" só faz sentido na tela onde a ação aconteceu.
    document.querySelectorAll('#toast-area .toast').forEach((t) => { if (t.querySelector('button')) t.remove(); });
    limpar = render(novaTela(), m) || null;
    window.scrollTo(0, 0);
    break;
  }
}

async function iniciar() {
  document.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
  try {
    await carregar();
  } catch (err) {
    console.error(err);
    app.innerHTML = '<div class="empty"><h2>Não foi possível abrir os dados</h2><p>Feche e abra o aplicativo novamente.</p></div>';
    return;
  }
  window.addEventListener('hashchange', navegar);
  navegar();
  pedirArmazenamentoPersistente();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Nova versão disponível', { action: 'Atualizar', onAction: () => location.reload() });
          }
        });
      });
    }).catch(() => {});
  }
}

iniciar();
