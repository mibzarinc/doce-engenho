// Janela com os dados do produto (foto, nome, categoria, observações, peso e medidas).
// Usada para criar um produto novo e para editar um existente.

import { openModal, esc, num, parseNum, icon, toast, comprimirImagem, escolherArquivo, autoSelect } from '../ui.js';
import { seletorCategoria } from './categorias.js';

const MEDIDAS = [
  ['peso', 'Peso', 'g', 'numeric'],
  ['comprimento', 'Comprimento', 'cm', 'decimal'],
  ['largura', 'Largura', 'cm', 'decimal'],
  ['altura', 'Altura', 'cm', 'decimal'],
];

/**
 * @param {object|null} produto  null = produto novo
 * @returns Promise<object|null> os dados escolhidos, ou null se cancelou
 */
export function abrirFormProduto(produto = null) {
  const novo = !produto;
  const d = {
    nome: produto?.nome || '', categoria: produto?.categoria || '', notas: produto?.notas || '',
    foto: produto?.foto || null,
    peso: produto?.peso || 0, comprimento: produto?.comprimento || 0, largura: produto?.largura || 0, altura: produto?.altura || 0,
  };

  const modal = openModal({
    title: novo ? 'Novo produto' : 'Dados do produto',
    wide: true,
    body: `
      <div class="pf-top">
        <div class="pf-foto" data-foto-wrap></div>
        <div class="pf-fields">
          <label class="field"><span>Nome do produto</span>
            <input class="inp" name="nome" value="${esc(d.nome)}" placeholder="Ex.: Ursinho Mel" autocomplete="off"></label>
          <label class="field"><span>Observações <small>(opcional)</small></span>
            <textarea class="inp" name="notas" rows="3" placeholder="Cores, variações, cuidados…">${esc(d.notas)}</textarea></label>
        </div>
      </div>
      <div class="field"><span>Categoria</span><div data-cats></div></div>
      <div class="field">
        <span>Peso e medidas <small>(opcional)</small></span>
        <small style="margin-top:-2px">Do produto <b>já embalado</b>, como vai para o correio. Servem para calcular o frete nos anúncios.</small>
        <div class="pf-medidas">${MEDIDAS.map(([k, rot, un, modo]) => `
          <label class="field"><small>${rot}</small>
            <div class="inp-group"><input class="inp" name="${k}" inputmode="${modo}" value="${d[k] ? String(d[k]).replace('.', ',') : ''}" placeholder="0"><span>${un}</span></div></label>`).join('')}
        </div>
      </div>`,
    foot: `<button class="btn soft" data-close>Cancelar</button>
           <button class="btn primary" data-ok>${novo ? `Continuar ${icon('arrow')}` : `${icon('check')} Salvar`}</button>`,
    onOpen: (el, close) => {
      autoSelect(el);
      const f = (n) => el.querySelector(`[name="${n}"]`);
      const cat = seletorCategoria(el.querySelector('[data-cats]'), d.categoria);
      if (novo) setTimeout(() => f('nome').focus(), 60);

      const fotoWrap = el.querySelector('[data-foto-wrap]');
      const renderFoto = () => {
        fotoWrap.innerHTML = d.foto
          ? `<button type="button" class="photo-box" data-foto><img src="${d.foto}" alt="Foto do produto"><span class="over">${icon('camera')} Trocar</span></button>
             <button type="button" class="btn ghost small danger" data-foto-rm>${icon('trash')} Remover foto</button>`
          : `<button type="button" class="photo-box empty-photo" data-foto>${icon('camera')}<span>Adicionar foto</span><small class="muted">Câmera ou galeria</small></button>`;
      };
      renderFoto();
      fotoWrap.addEventListener('click', async (e) => {
        if (e.target.closest('[data-foto-rm]')) { d.foto = null; renderFoto(); return; }
        if (!e.target.closest('[data-foto]')) return;
        const arq = await escolherArquivo();
        if (!arq) return;
        try {
          d.foto = await comprimirImagem(arq);
          renderFoto();
        } catch {
          toast('Não foi possível abrir essa imagem');
        }
      });

      el.querySelector('[data-ok]').addEventListener('click', () => {
        d.nome = f('nome').value.trim();
        if (!d.nome) { f('nome').focus(); toast('Dê um nome ao produto'); return; }
        d.notas = f('notas').value.trim();
        d.categoria = cat.valor();
        for (const [k] of MEDIDAS) d[k] = Math.max(0, parseNum(f(k).value));
        close(d);
      });
      f('nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') f('notas').focus(); });
    },
  });
  return modal.done;
}

/** Ex.: ["350 g", "30 × 20 × 15 cm"] — só o que foi preenchido. */
export function textoMedidas(p) {
  const partes = [];
  if (p.peso) partes.push(p.peso >= 1000 ? `${num(p.peso / 1000, 2)} kg` : `${num(p.peso, 0)} g`);
  const dims = [p.comprimento, p.largura, p.altura];
  if (dims.some(Boolean)) partes.push(`${dims.map((v) => num(v || 0, 1)).join(' × ')} cm`);
  return partes;
}
