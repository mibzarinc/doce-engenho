// Categorias dos produtos: janela para criar, renomear e excluir,
// e o seletor em botões usado no cadastro do produto.

import {
  categorias, produtosDaCategoria, adicionarCategoria, renomearCategoria, excluirCategoria,
} from '../store.js';
import { openModal, confirmDialog, esc, icon, toast } from '../ui.js';

const contagem = (n) => (n ? `${n} produto${n > 1 ? 's' : ''}` : 'Nenhum produto');

/** Janela de gerenciamento. Resolve quando fechada. */
export function abrirCategorias({ onRename } = {}) {
  let editando = null; // nome da categoria em edição

  const modal = openModal({
    title: 'Categorias',
    body: `
      <p class="hint" style="margin:0">Organize os produtos por tipo. Ao renomear, os produtos acompanham a mudança.</p>
      <div class="cat-list" data-lista></div>
      <form class="cat-add" data-add>
        <input class="inp" name="nova" placeholder="Nova categoria" autocomplete="off" aria-label="Nome da nova categoria">
        <button class="btn primary" type="submit">${icon('plus')} Adicionar</button>
      </form>`,
    foot: `<button class="btn soft" data-close>Pronto</button>`,
    onOpen: (el) => {
      const lista = el.querySelector('[data-lista]');
      const render = () => {
        const cats = categorias();
        lista.innerHTML = cats.length ? cats.map((c) => {
          const n = produtosDaCategoria(c).length;
          if (c === editando) {
            return `<form class="cat-row editing" data-ren="${esc(c)}">
              <input class="inp" name="nome" value="${esc(c)}" autocomplete="off" aria-label="Novo nome">
              <button class="icon-btn" type="submit" aria-label="Salvar nome">${icon('check')}</button>
              <button class="icon-btn" type="button" data-cancel aria-label="Cancelar">${icon('x')}</button>
            </form>`;
          }
          return `<div class="cat-row" data-cat="${esc(c)}">
            <div><b>${esc(c)}</b><small>${contagem(n)}</small></div>
            <button class="icon-btn" type="button" data-edit aria-label="Renomear ${esc(c)}">${icon('edit')}</button>
            <button class="icon-btn danger" type="button" data-rm aria-label="Excluir ${esc(c)}">${icon('trash')}</button>
          </div>`;
        }).join('') : '<p class="muted" style="text-align:center;margin:8px 0">Nenhuma categoria ainda.</p>';
        const inp = lista.querySelector('.editing input');
        if (inp) { inp.focus(); inp.select(); }
      };
      render();

      lista.addEventListener('click', async (e) => {
        if (e.target.closest('[data-cancel]')) { editando = null; render(); return; }
        const row = e.target.closest('[data-cat]');
        if (!row) return;
        const nome = row.dataset.cat;
        if (e.target.closest('[data-edit]')) { editando = nome; render(); return; }
        if (e.target.closest('[data-rm]')) {
          const n = produtosDaCategoria(nome).length;
          const ok = await confirmDialog({
            title: 'Excluir categoria?',
            message: n
              ? `<b>${esc(nome)}</b> tem <b>${contagem(n).toLowerCase()}</b>. ${n > 1
                ? 'Eles continuam cadastrados, só ficam sem categoria.'
                : 'Ele continua cadastrado, só fica sem categoria.'}`
              : `<b>${esc(nome)}</b> será excluída.`,
            ok: 'Excluir', danger: true,
          });
          if (!ok) return;
          await excluirCategoria(nome);
          toast('Categoria excluída');
          render();
        }
      });

      lista.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target.closest('[data-ren]');
        const nova = form.elements.nome.value.trim();
        if (!nova) { toast('Dê um nome à categoria'); return; }
        const antiga = form.dataset.ren;
        editando = null;
        if (nova !== antiga) {
          const final = await renomearCategoria(antiga, nova);
          onRename?.(antiga, final);
          toast(final === nova ? 'Categoria renomeada' : `Juntada com ${final}`);
        }
        render();
      });

      el.querySelector('[data-add]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = e.target.elements.nova;
        const nome = inp.value.trim();
        if (!nome) { inp.focus(); return; }
        const existia = categorias().includes(nome);
        await adicionarCategoria(nome);
        toast(existia ? 'Essa categoria já existe' : 'Categoria adicionada');
        inp.value = '';
        render();
        inp.focus();
      });
    },
  });
  return modal.done;
}

/**
 * Seletor de categoria em botões (um toque escolhe, outro toque desmarca).
 * Inclui criar uma nova na hora e abrir o gerenciamento.
 * @returns {{ valor: () => string }}
 */
export function seletorCategoria(box, inicial = '') {
  let atual = inicial || '';
  let criando = false;

  const render = () => {
    const cats = categorias();
    box.innerHTML = `
      <div class="chips cat-pick" role="radiogroup" aria-label="Categoria">
        ${cats.map((c) => `<button type="button" class="chip ${c === atual ? 'active' : ''}" role="radio"
          aria-checked="${c === atual}" data-c="${esc(c)}">${c === atual ? icon('check') : ''}${esc(c)}</button>`).join('')}
        ${criando ? '' : `<button type="button" class="chip add" data-nova>${icon('plus')} Nova</button>`}
      </div>
      ${criando ? `<div class="cat-add" data-criar>
        <input class="inp" placeholder="Nome da nova categoria" autocomplete="off" aria-label="Nome da nova categoria">
        <button type="button" class="btn primary" data-ok>Adicionar</button>
        <button type="button" class="btn soft" data-cancel>Cancelar</button>
      </div>` : ''}
      <button type="button" class="link-btn" data-gerenciar>${icon('edit')} Editar categorias</button>`;
    if (criando) box.querySelector('[data-criar] input').focus();
  };

  const criar = async () => {
    const inp = box.querySelector('[data-criar] input');
    const nome = inp.value.trim();
    if (!nome) { inp.focus(); return; }
    atual = await adicionarCategoria(nome);
    criando = false;
    render();
  };

  box.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-c]');
    if (c) { atual = atual === c.dataset.c ? '' : c.dataset.c; render(); return; }
    if (e.target.closest('[data-nova]')) { criando = true; render(); return; }
    if (e.target.closest('[data-cancel]')) { criando = false; render(); return; }
    if (e.target.closest('[data-ok]')) { await criar(); return; }
    if (e.target.closest('[data-gerenciar]')) {
      await abrirCategorias({ onRename: (antiga, nova) => { if (atual === antiga) atual = nova; } });
      // A categoria escolhida pode ter sido excluída.
      if (atual && !categorias().includes(atual)) atual = '';
      render();
    }
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('[data-criar]')) { e.preventDefault(); criar(); }
  });

  render();
  return { valor: () => atual };
}
