// Janela de cadastro/edição de insumo — usada na tela Insumos e dentro do produto.

import { openModal, confirmDialog, esc, brl, brlUnit, num, fixo, parseNum, uid, icon, toast, autoSelect } from '../ui.js';
import { GRUPOS_UNIDADES, UNIDADES, rotulo, unidadeBase, custoPorUnidade } from '../calc.js';
import { salvarMaterial, excluirMaterial, usosDoMaterial } from '../store.js';

export function textoCustoUnitario(m) {
  const base = unidadeBase(m.unidade);
  const porCompra = custoPorUnidade(m, m.unidade);
  if (base !== m.unidade) {
    return `${brlUnit(porCompra)} por ${rotulo(m.unidade)} · ${brlUnit(custoPorUnidade(m, base))} por ${rotulo(base)}`;
  }
  return `${brlUnit(porCompra)} por ${rotulo(m.unidade)}`;
}

/** @returns Promise<{acao:'salvo', mat} | {acao:'excluido'} | null> */
export function abrirFormMaterial(existente = null, { nomeInicial = '' } = {}) {
  const m = existente ? structuredClone(existente) : { id: uid(), nome: nomeInicial, qtd: 1, unidade: 'm', preco: 0, fornecedor: '', criadoEm: Date.now() };
  const usos = existente ? usosDoMaterial(existente.id).length : 0;
  const opcoes = GRUPOS_UNIDADES.map(([g, us]) => `<optgroup label="${g}">${us.map((u) =>
    `<option value="${u}" ${u === m.unidade ? 'selected' : ''}>${rotulo(u)} — ${UNIDADES[u].nome}</option>`).join('')}</optgroup>`).join('');

  const modal = openModal({
    title: existente ? 'Editar insumo' : 'Novo insumo',
    body: `
      <label class="field"><span>Nome do insumo</span>
        <input class="inp" name="nome" value="${esc(m.nome)}" placeholder="Ex.: Tecido tricoline, Fibra, Olhos de segurança" autocomplete="off"></label>
      <div>
        <div class="field-label" style="margin-bottom:6px">Como você compra?</div>
        <div class="grid-2">
          <label class="field"><small>Quantidade que vem</small>
            <input class="inp num" name="qtd" inputmode="decimal" value="${num(m.qtd, 3)}"></label>
          <label class="field"><small>Unidade</small>
            <select class="sel" name="unidade">${opcoes}</select></label>
        </div>
      </div>
      <label class="field"><span>Preço que você pagou</span>
        <div class="inp-group"><span>R$</span><input class="inp" name="preco" inputmode="decimal" value="${fixo(m.preco)}"></div></label>
      <label class="field"><span>Onde comprou <small>(opcional)</small></span>
        <input class="inp" name="fornecedor" value="${esc(m.fornecedor || '')}" placeholder="Ex.: Armarinho São José"></label>
      <div class="preview-cost" data-preview></div>
      ${usos ? `<p class="hint" style="margin:0">${icon('info')} Usado em ${usos} produto${usos > 1 ? 's' : ''}. Ao mudar o preço, todos são recalculados automaticamente.</p>` : ''}
    `,
    foot: `
      ${existente ? `<button class="btn danger" data-del>${icon('trash')} Excluir</button>` : ''}
      <button class="btn soft" data-close>Cancelar</button>
      <button class="btn primary" data-save>${icon('check')} Salvar</button>`,
    onOpen: (el, close) => {
      autoSelect(el);
      const f = (n) => el.querySelector(`[name="${n}"]`);
      const ler = () => {
        m.nome = f('nome').value.trim();
        m.qtd = parseNum(f('qtd').value);
        m.unidade = f('unidade').value;
        m.preco = parseNum(f('preco').value);
        m.fornecedor = f('fornecedor').value.trim();
      };
      const preview = () => {
        ler();
        el.querySelector('[data-preview]').innerHTML = m.qtd > 0
          ? `Custo: <b>${textoCustoUnitario(m)}</b>`
          : 'Informe a quantidade que vem na embalagem.';
      };
      el.addEventListener('input', preview);
      el.addEventListener('change', preview);
      preview();
      setTimeout(() => (m.nome ? f('preco') : f('nome')).focus(), 60);

      el.querySelector('[data-save]').addEventListener('click', async () => {
        ler();
        if (!m.nome) { f('nome').focus(); toast('Dê um nome ao insumo'); return; }
        if (!(m.qtd > 0)) { f('qtd').focus(); toast('A quantidade precisa ser maior que zero'); return; }
        await salvarMaterial(m);
        toast(existente ? 'Insumo atualizado' : 'Insumo cadastrado');
        close({ acao: 'salvo', mat: m });
      });

      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Excluir insumo?',
          message: usos
            ? `<b>${esc(m.nome)}</b> está em <b>${usos} produto${usos > 1 ? 's' : ''}</b> e será retirado deles. Os preços serão recalculados.`
            : `<b>${esc(m.nome)}</b> será excluído.`,
          ok: 'Excluir', danger: true,
        });
        if (!ok) return;
        await excluirMaterial(m.id);
        toast('Insumo excluído');
        close({ acao: 'excluido' });
      });
    },
  });
  return modal.done;
}
