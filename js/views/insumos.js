// Biblioteca de insumos: cadastre uma vez, use em todos os produtos.

import { state, usosDoMaterial } from '../store.js';
import { rotulo, custoPorUnidade, unidadeBase } from '../calc.js';
import { esc, brl, brlUnit, num, icon, fmtData } from '../ui.js';
import { abrirFormMaterial } from './material-form.js';

let busca = '';

export function renderInsumos(root) {
  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Insumos</h1>
        <p class="lead">Cadastre cada material uma vez, com o preço que você paga. Quando o preço mudar, atualize aqui e todos os produtos são recalculados.</p>
      </div>
      <div class="actions"><button class="btn primary" data-novo>${icon('plus')} Novo insumo</button></div>
    </div>
    <div class="toolbar">
      <label class="search">${icon('search')}<span class="sr-only">Buscar</span>
        <input class="inp" type="search" data-busca placeholder="Buscar insumo…" value="${esc(busca)}"></label>
      <span class="muted" data-count></span>
    </div>
    <div data-lista></div>`;

  const lista = root.querySelector('[data-lista]');
  const render = () => {
    const t = busca.trim().toLocaleLowerCase('pt-BR');
    const mats = state.materiais
      .filter((m) => !t || `${m.nome} ${m.fornecedor || ''}`.toLocaleLowerCase('pt-BR').includes(t))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    root.querySelector('[data-count]').textContent = `${state.materiais.length} cadastrado${state.materiais.length === 1 ? '' : 's'}`;

    if (!state.materiais.length) {
      lista.innerHTML = `<div class="empty card" style="max-width:none">
        <div class="art" style="color:var(--sage);width:90px">${icon('box')}</div>
        <h2>Nenhum insumo ainda</h2>
        <p>Comece pelos materiais que você mais usa: tecidos, fibra, linhas, olhos de segurança, feltro, embalagens…</p>
        <div class="actions"><button class="btn primary" data-novo>${icon('plus')} Cadastrar primeiro insumo</button></div></div>`;
      return;
    }
    if (!mats.length) { lista.innerHTML = '<p class="muted" style="text-align:center;padding:30px">Nenhum insumo encontrado.</p>'; return; }

    lista.innerHTML = `<div class="mat-grid">${mats.map((m) => {
      const usos = usosDoMaterial(m.id).length;
      const base = unidadeBase(m.unidade);
      return `<button type="button" class="card mat-card" data-id="${m.id}">
        <div class="top"><b>${esc(m.nome)}</b>${icon('edit')}</div>
        <div class="buy">Compra: <b>${num(m.qtd, 3)} ${rotulo(m.unidade)}</b> por <b>${brl(m.preco)}</b>${m.fornecedor ? ` · ${esc(m.fornecedor)}` : ''}</div>
        <div class="unit-cost"><span>Custo por ${rotulo(base)}</span><b>${brlUnit(custoPorUnidade(m, base))}</b></div>
        <div class="foot"><span>${usos ? `Usado em ${usos} produto${usos > 1 ? 's' : ''}` : 'Ainda não usado'}</span>
          <span>${m.atualizadoEm ? `Preço de ${fmtData(m.atualizadoEm)}` : ''}</span></div>
      </button>`;
    }).join('')}</div>`;
  };
  render();

  root.querySelector('[data-busca]').addEventListener('input', (e) => { busca = e.target.value; render(); });
  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-novo]')) {
      const r = await abrirFormMaterial(null, { nomeInicial: busca.trim() });
      if (r) render();
      return;
    }
    const card = e.target.closest('[data-id]');
    if (card) {
      const r = await abrirFormMaterial(state.materiais.find((m) => m.id === card.dataset.id));
      if (r) render();
    }
  });
}
