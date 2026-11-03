// Painel de produtos: cards com foto, custos e preço mínimo por canal.

import { state, categoriasEmUso, mapaMateriais, novoProduto, salvarProduto, carregarExemplo } from '../store.js';
import { calcularProduto } from '../calc.js';
import { NOMES_CURTOS } from '../defaults.js';
import { esc, brl, fmtTempo, icon, placeholder, teddy, toast } from '../ui.js';
import { abrirFormProduto } from './produto-form.js';
import { abrirCategorias } from './categorias.js';

const ui = { busca: '', cat: '', ordem: 'recentes' };

export function renderDashboard(root) {
  const { produtos, materiais, cfg } = state;

  if (!produtos.length) {
    root.innerHTML = vazio(materiais.length);
    root.querySelectorAll('[data-novo]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); abrirNovoProduto(); }));
    root.querySelector('[data-exemplo]')?.addEventListener('click', async () => {
      await carregarExemplo();
      toast('Exemplo carregado — toque em um produto para ver o cálculo');
      renderDashboard(root);
    });
    return;
  }

  const diasBackup = cfg.ultimoBackup ? (Date.now() - cfg.ultimoBackup) / 864e5 : Infinity;
  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Meus produtos</h1>
        <p class="lead">Toque em um produto para ver os insumos, o tempo e o preço em cada canal.</p>
      </div>
      <div class="actions">
        <button class="btn primary" data-novo>${icon('plus')} Novo produto</button>
      </div>
    </div>

    ${diasBackup > 14 ? `
      <div class="banner">${icon('shield')}
        <p>${cfg.ultimoBackup ? `Seu último backup foi há ${Math.floor(diasBackup)} dias.` : 'Você ainda não fez nenhum backup.'} Guarde uma cópia dos seus dados por segurança.</p>
        <a class="btn small" href="#/ajustes?backup">Fazer backup</a>
      </div>` : ''}

    <div class="stats">
      <div class="card stat"><span class="bubble" style="background:var(--rose-50);color:var(--rose)">${icon('heart')}</span>
        <div><b>${produtos.length}</b><small>produto${produtos.length > 1 ? 's' : ''}</small></div></div>
      <a class="card stat link" href="#/insumos"><span class="bubble" style="background:var(--sage-50);color:var(--sage)">${icon('box')}</span>
        <div><b>${materiais.length}</b><small>insumos cadastrados</small></div></a>
      <a class="card stat link" href="#/ajustes"><span class="bubble" style="background:var(--honey-50);color:var(--honey)">${icon('clock')}</span>
        <div><b>${brl(cfg.horaPadrao)}</b><small>valor da sua hora</small></div></a>
    </div>

    <div class="toolbar">
      <label class="search">${icon('search')}<span class="sr-only">Buscar</span>
        <input class="inp" type="search" data-busca placeholder="Buscar produto…" value="${esc(ui.busca)}"></label>
      <div class="chips" data-cats></div>
      <select class="sel" data-ordem aria-label="Ordenar">
        <option value="recentes">Mais recentes</option>
        <option value="nome">Nome (A–Z)</option>
        <option value="preco">Maior preço</option>
        <option value="tempo">Mais demorados</option>
      </select>
    </div>

    <div class="prod-grid" data-grid></div>`;

  root.querySelector('[data-ordem]').value = ui.ordem;
  root.querySelector('[data-novo]').addEventListener('click', abrirNovoProduto);
  root.querySelector('[data-busca]').addEventListener('input', (e) => { ui.busca = e.target.value; renderGrid(root); });
  root.querySelector('[data-ordem]').addEventListener('change', (e) => { ui.ordem = e.target.value; renderGrid(root); });
  root.querySelector('[data-cats]').addEventListener('click', (e) => {
    if (e.target.closest('[data-cat-edit]')) {
      abrirCategorias().then(() => { renderCats(root); renderGrid(root); });
      return;
    }
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    ui.cat = b.dataset.cat;
    renderCats(root);
    renderGrid(root);
  });
  renderCats(root);
  renderGrid(root);
}

function renderCats(root) {
  const cats = categoriasEmUso();
  if (ui.cat && !cats.includes(ui.cat)) ui.cat = '';
  root.querySelector('[data-cats]').innerHTML = (cats.length < 2 ? '' :
    ['', ...cats].map((c) => `<button class="chip ${ui.cat === c ? 'active' : ''}" data-cat="${esc(c)}">${c ? esc(c) : 'Todos'}</button>`).join(''))
    + `<button class="chip ghost" data-cat-edit>${icon('edit')} Categorias</button>`;
}

function renderGrid(root) {
  const mapa = mapaMateriais();
  const termo = ui.busca.trim().toLocaleLowerCase('pt-BR');
  let lista = state.produtos
    .filter((p) => !ui.cat || p.categoria === ui.cat)
    .filter((p) => !termo || `${p.nome} ${p.categoria}`.toLocaleLowerCase('pt-BR').includes(termo))
    .map((p) => ({ p, c: calcularProduto(p, mapa, state.cfg) }));

  const maxPreco = (c) => Math.max(0, ...c.canais.map((x) => x.min?.preco || 0));
  const ord = {
    recentes: (a, b) => (b.p.atualizadoEm || 0) - (a.p.atualizadoEm || 0),
    nome: (a, b) => (a.p.nome || '').localeCompare(b.p.nome || '', 'pt-BR'),
    preco: (a, b) => maxPreco(b.c) - maxPreco(a.c),
    tempo: (a, b) => (b.p.tempoMin || 0) - (a.p.tempoMin || 0),
  }[ui.ordem];
  lista.sort(ord);

  const grid = root.querySelector('[data-grid]');
  if (!lista.length) {
    grid.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center;padding:30px">Nenhum produto encontrado.</p>`;
    return;
  }
  grid.innerHTML = lista.map(({ p, c }) => card(p, c)).join('');
}

function card(p, c) {
  const n = c.canais.length || 1;
  return `
  <a class="card prod-card" href="#/produto/${p.id}">
    <div class="prod-img">
      ${p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : placeholder(p.nome)}
      ${p.categoria ? `<span class="tag">${esc(p.categoria)}</span>` : ''}
      ${!c.completo ? `<span class="tag warn">${icon('alert')} Incompleto</span>` : ''}
    </div>
    <div class="prod-body">
      <h3>${esc(p.nome || 'Sem nome')}</h3>
      <div class="prod-meta">
        <span>${icon('clock')} ${fmtTempo(c.tempoMin)}</span>
        <span>${icon('box')} ${c.linhas.length} insumo${c.linhas.length === 1 ? '' : 's'}</span>
      </div>
      <div class="prod-cost">
        <div><small>Materiais</small><b>${brl(c.materiais + c.perda)}</b></div>
        <div><small>Mão de obra</small><b>${brl(c.maoDeObra)}</b></div>
        <div style="text-align:right"><small>Precisa receber</small><b>${brl(c.alvo)}</b></div>
      </div>
      <div class="pp-label">Preço mínimo de anúncio</div>
      <div class="prod-prices" style="--n:${n}">
        ${c.canais.map(({ canal, min }) => `
          <div class="pp c-${canal.id}"><small>${NOMES_CURTOS[canal.id] || esc(canal.nome)}</small>
            <b>${min ? brl(min.preco) : '—'}</b></div>`).join('')}
      </div>
    </div>
  </a>`;
}

function vazio(temMateriais) {
  return `
  <div class="empty">
    <div class="art" style="color:var(--rose)">${teddy()}</div>
    <h2>Vamos começar!</h2>
    <p>Aqui você cadastra cada peça do ateliê e descobre o preço mínimo para anunciar em cada canal, sem perder o valor da sua hora de trabalho.</p>
    <div class="steps">
      <a class="card" href="#/ajustes"><div><b>Defina o valor da sua hora</b><small>Quanto você quer ganhar por hora de trabalho.</small></div></a>
      <a class="card" href="#/insumos"><div><b>Cadastre seus insumos</b><small>Tecidos, fibra, linhas, olhos, embalagens… com o preço que você paga.</small></div></a>
      <a class="card" href="#/" data-novo><div><b>Cadastre o primeiro produto</b><small>Escolha os insumos, o tempo de produção e pronto.</small></div></a>
    </div>
    <div class="actions">
      <button class="btn primary" data-novo>${icon('plus')} Cadastrar produto</button>
      ${temMateriais ? '' : `<button class="btn soft" data-exemplo>${icon('sparkle')} Ver um exemplo pronto</button>`}
    </div>
  </div>`;
}

/** Pede os dados básicos e abre o detalhe do produto novo. */
export async function abrirNovoProduto() {
  const dados = await abrirFormProduto(null);
  if (!dados) return;
  const p = novoProduto(dados);
  await salvarProduto(p);
  location.hash = `#/produto/${p.id}`;
}
