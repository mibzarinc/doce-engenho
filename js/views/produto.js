// Detalhe do produto: dados, insumos, tempo, valor da hora e preço por canal.
// Tudo é salvo automaticamente enquanto ela edita.

import { state, mapaMateriais, salvarProduto, excluirProduto, duplicarProduto } from '../store.js';
import { NOMES_CURTOS } from '../defaults.js';
import {
  calcularProduto, simular, custoInsumo, custoPorUnidade, unidadesCompativeis, unidadeBase, rotulo,
} from '../calc.js';
import {
  esc, brl, brlUnit, num, fixo, parseNum, fmtTempo, icon, placeholder, debounce, toast, openModal,
  confirmDialog, autoSelect,
} from '../ui.js';
import { abrirFormMaterial, textoCustoUnitario } from './material-form.js';
import { abrirFormProduto, textoMedidas } from './produto-form.js';

const abertos = new Set(); // sanfonas abertas (mantidas ao recalcular)
let simValor = '';

const acc = (key, summary, body, cls = '') => `
  <details class="acc ${cls}" data-acc="${key}" ${abertos.has(key) ? 'open' : ''}>
    <summary>${summary}${icon('chev', 'chev')}</summary>
    <div class="acc-body">${body}</div>
  </details>`;

function textoFaixa(faixa, ate) {
  const de = faixa.min || 0;
  if (ate == null) return de ? `A partir de ${brl(de)}` : 'Qualquer preço';
  return de ? `De ${brl(de)} a ${brl(ate - 0.01)}` : `Até ${brl(ate - 0.01)}`;
}

export function renderProduto(root, id) {
  const p = state.produtos.find((x) => x.id === id);
  if (!p) {
    root.innerHTML = `<div class="empty"><h2>Produto não encontrado</h2><p>Ele pode ter sido excluído.</p>
      <a class="btn primary" href="#/">${icon('back')} Voltar aos produtos</a></div>`;
    return null;
  }
  p.insumos ||= [];
  p.frete = { ecommerce: 0, ml: 0, shopee: 0, ...(p.frete || {}) };
  const cfg = state.cfg;
  let excluido = false;

  /* ---------- salvar ---------- */
  const salvar = debounce(async () => {
    if (excluido) return;
    await salvarProduto(p);
    estadoSalvo(true);
  }, 500);
  const mudou = () => { estadoSalvo(false); salvar(); atualizar(); };

  /* ---------- estrutura ---------- */
  const canaisAtivos = cfg.canais.filter((c) => c.ativo);
  const h = Math.floor((p.tempoMin || 0) / 60), m = (p.tempoMin || 0) % 60;

  root.innerHTML = `
  <div class="prod-top">
    <a class="btn ghost" href="#/">${icon('back')} Produtos</a>
    <span class="spacer"></span>
    <span class="save-state" data-save-state>${icon('check')} Salvo</span>
    <button class="btn small soft" data-dup>${icon('copy')} Duplicar</button>
    <button class="btn small danger" data-del>${icon('trash')} Excluir</button>
  </div>

  <div class="prod-page">
    <section class="card hero-view" data-hero></section>

    <div class="prod-cols">
      <section class="card section">
        <div class="section-head"><span class="step">1</span><h2>Insumos</h2><span class="total" data-tot-mat></span></div>
        <p class="hint">Quanto de cada material vai em <b>uma unidade</b> do produto. Toque no nome para editar o preço do insumo.</p>
        <div data-insumos></div>
        <button class="btn dashed block" data-add-ins>${icon('plus')} Adicionar insumo</button>
        <div class="field" style="margin-top:18px">
          <span>Margem de perda e desperdício</span>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div class="stepper" style="width:200px">
              <button type="button" data-step="p:-1" aria-label="Diminuir">−</button>
              <input data-perda inputmode="decimal" value="${num(p.perdaPct || 0, 1)}" aria-label="Perda em %"><span class="unit">%</span>
              <button type="button" data-step="p:1" aria-label="Aumentar">+</button>
            </div>
            <small style="flex:1;min-width:180px">Retalhos, sobras de fibra e linha. Aplicada sobre o custo dos materiais.</small>
          </div>
        </div>
      </section>

      <section class="card section">
        <div class="section-head"><span class="step">2</span><h2>Tempo e mão de obra</h2><span class="total" data-tot-mo></span></div>
        <div class="field-label" style="margin-bottom:6px">Tempo médio para produzir 1 unidade</div>
        <div class="time-row">
          <div class="stepper">
            <button type="button" data-step="h:-1" aria-label="Menos uma hora">−</button>
            <input data-h inputmode="numeric" value="${h}" aria-label="Horas"><span class="unit">h</span>
            <button type="button" data-step="h:1" aria-label="Mais uma hora">+</button>
          </div>
          <div class="stepper">
            <button type="button" data-step="m:-5" aria-label="Menos 5 minutos">−</button>
            <input data-m inputmode="numeric" value="${m}" aria-label="Minutos"><span class="unit">min</span>
            <button type="button" data-step="m:5" aria-label="Mais 5 minutos">+</button>
          </div>
        </div>
        <div class="quick">${[30, 60, 90, 120, 180, 240, 360].map((t) =>
          `<button type="button" class="chip" data-tempo="${t}">${fmtTempo(t)}</button>`).join('')}</div>

        <div class="field" style="margin-top:20px">
          <span>Valor da hora de trabalho</span>
          <div class="seg" role="radiogroup">
            <label><input type="radio" name="hora" value="padrao" ${p.horaPropria == null ? 'checked' : ''}><span>Meu padrão (${brl(cfg.horaPadrao)}/h)</span></label>
            <label><input type="radio" name="hora" value="propria" ${p.horaPropria != null ? 'checked' : ''}><span>Valor só deste produto</span></label>
          </div>
          <div class="inp-group" data-hora-wrap ${p.horaPropria == null ? 'hidden' : ''} style="margin-top:8px;max-width:260px">
            <span>R$</span><input class="inp" data-hora inputmode="decimal" value="${fixo(p.horaPropria ?? cfg.horaPadrao)}"><span>/hora</span></div>
        </div>
        <div class="calc-line" style="margin-top:16px"><span data-mo-txt></span><b data-mo-val></b></div>
      </section>
    </div>

      ${acc('frete', `${icon('truck')} <span>Frete que você paga <small class="muted">(opcional)</small></span>`, `
        <p class="hint">Preencha só se <b>você</b> paga parte do frete. No Mercado Livre, a partir de ${brl(79)} o frete é grátis para o comprador e parte dele é cobrada de você (o valor aparece no anúncio, conforme o peso). Na Shopee o frete grátis já está incluído na comissão.</p>
        <div class="grid-3">${canaisAtivos.map((c) => `
          <label class="field"><span>${esc(c.nome)}</span>
            <div class="inp-group"><span>R$</span><input class="inp" data-frete="${c.id}" inputmode="decimal" value="${fixo(p.frete[c.id] || 0)}"></div></label>`).join('')}
        </div>`, 'boxed card')}

    <section class="card section results" id="precos">
      <div class="section-head"><span class="step">3</span><h2>Preço mínimo de anúncio</h2></div>
      <div data-resultados></div>
      ${acc('sim', `${icon('calc')} Simular outro preço`, `
        <div class="sim-row">
          <label class="field"><span>Se eu anunciar por</span>
            <div class="inp-group"><span>R$</span><input class="inp" data-sim inputmode="decimal" value="${esc(simValor)}" placeholder="0,00"></div></label>
        </div>
        <div data-sim-tab></div>`, 'boxed sim')}
    </section>
  </div>

  <button type="button" class="price-dock" data-dock hidden aria-label="Ver preço mínimo de anúncio"></button>`;

  const $ = (s) => root.querySelector(s);
  const insEl = $('[data-insumos]');
  autoSelect(root);

  /* ---------- dados do produto (só exibição; edição pela janela) ---------- */
  function renderHero() {
    const temDims = [p.comprimento, p.largura, p.altura].some(Boolean);
    const medidas = textoMedidas(p);
    $('[data-hero]').innerHTML = `
      <button type="button" class="hv-foto" data-editar aria-label="Editar dados e foto">
        ${p.foto ? `<img src="${p.foto}" alt="Foto de ${esc(p.nome)}">` : placeholder(p.nome)}
      </button>
      <div class="hv-info">
        <div class="hv-top">
          ${p.categoria ? `<span class="tag cat">${esc(p.categoria)}</span>` : '<span class="tag none">Sem categoria</span>'}
          <button type="button" class="btn small soft" data-editar>${icon('edit')} Editar dados</button>
        </div>
        <h1>${esc(p.nome || 'Sem nome')}</h1>
        ${p.notas ? `<p class="hv-notas">${esc(p.notas)}</p>` : ''}
        <div class="hv-meta">
          ${p.peso ? `<span>${icon('weight')} ${medidas[0]}</span>` : ''}
          ${temDims ? `<span>${icon('ruler')} ${medidas[medidas.length - 1]}</span>` : ''}
          ${medidas.length ? '' : `<button type="button" class="link-btn" data-editar>${icon('plus')} Informar peso e medidas</button>`}
        </div>
      </div>`;
  }
  renderHero();
  $('[data-hero]').addEventListener('click', async (e) => {
    if (!e.target.closest('[data-editar]')) return;
    const d = await abrirFormProduto(p);
    if (!d) return;
    Object.assign(p, d);
    renderHero(); mudou();
  });

  /* ---------- insumos ---------- */
  function renderInsumos() {
    if (!insEl.isConnected) return;
    const mapa = mapaMateriais();
    if (!p.insumos.length) {
      insEl.innerHTML = `<div class="ins-empty">Nenhum insumo ainda. Toque em <b>Adicionar insumo</b> para começar.</div>`;
      return;
    }
    insEl.innerHTML = `<div class="ins-list">${p.insumos.map((it, i) => {
      const mat = mapa.get(it.materialId);
      if (!mat) {
        return `<div class="ins-row missing" data-i="${i}"><div class="ins-name"><b>Insumo excluído</b><small>Remova esta linha</small></div>
          <div></div><div class="ins-cost">${brl(0)}</div>
          <button class="icon-btn danger" data-rm aria-label="Remover">${icon('trash')}</button></div>`;
      }
      const us = unidadesCompativeis(mat.unidade);
      if (!us.includes(it.unidade)) it.unidade = mat.unidade;
      return `<div class="ins-row" data-i="${i}">
        <button type="button" class="ins-name" data-edit-mat="${mat.id}"><b>${esc(mat.nome)}</b>
          <small>${brlUnit(custoPorUnidade(mat, it.unidade))} por ${rotulo(it.unidade)} ${icon('edit')}</small></button>
        <div class="ins-qty">
          <input inputmode="decimal" data-qtd value="${num(it.qtd, 3)}" aria-label="Quantidade de ${esc(mat.nome)}">
          ${us.length > 1
            ? `<select data-un aria-label="Unidade">${us.map((u) => `<option value="${u}" ${u === it.unidade ? 'selected' : ''}>${rotulo(u)}</option>`).join('')}</select>`
            : `<span class="u">${rotulo(it.unidade)}</span>`}
        </div>
        <div class="ins-cost" data-cost>${brl(custoInsumo(it, mat))}</div>
        <button type="button" class="icon-btn danger" data-rm aria-label="Remover ${esc(mat.nome)}">${icon('trash')}</button>
      </div>`;
    }).join('')}</div>`;
  }

  insEl.addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row || !e.target.matches('[data-qtd]')) return;
    const it = p.insumos[+row.dataset.i];
    it.qtd = parseNum(e.target.value);
    row.querySelector('[data-cost]').textContent = brl(custoInsumo(it, mapaMateriais().get(it.materialId)));
    mudou();
  });
  insEl.addEventListener('change', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row || !e.target.matches('[data-un]')) return;
    p.insumos[+row.dataset.i].unidade = e.target.value;
    renderInsumos(); mudou();
  });
  insEl.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-i]');
    if (!row) return;
    const i = +row.dataset.i;
    if (e.target.closest('[data-rm]')) {
      const [rem] = p.insumos.splice(i, 1);
      const nome = mapaMateriais().get(rem.materialId)?.nome || 'Insumo';
      renderInsumos(); mudou();
      toast(`${nome} removido`, {
        action: 'Desfazer',
        onAction: () => { p.insumos.splice(i, 0, rem); renderInsumos(); mudou(); },
      });
      return;
    }
    const ed = e.target.closest('[data-edit-mat]');
    if (ed) {
      const mat = state.materiais.find((x) => x.id === ed.dataset.editMat);
      if (!mat) return;
      await abrirFormMaterial(mat);
      renderInsumos(); atualizar();
    }
  });

  $('[data-add-ins]').addEventListener('click', async () => {
    const mat = await escolherInsumo(p);
    if (!mat) return;
    const base = unidadeBase(mat.unidade);
    p.insumos.push({ materialId: mat.id, qtd: 1, unidade: base });
    renderInsumos(); mudou();
    const inputs = insEl.querySelectorAll('[data-qtd]');
    const last = inputs[inputs.length - 1];
    last?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => last?.focus(), 250);
  });

  /* ---------- tempo, perda, hora ---------- */
  const inH = $('[data-h]'), inM = $('[data-m]'), inPerda = $('[data-perda]');
  const escreverTempo = () => {
    inH.value = Math.floor(p.tempoMin / 60);
    inM.value = p.tempoMin % 60;
  };
  const lerTempo = () => {
    p.tempoMin = Math.max(0, Math.round(parseNum(inH.value) * 60 + parseNum(inM.value)));
    mudou();
  };
  inH.addEventListener('input', lerTempo);
  inM.addEventListener('input', lerTempo);
  inH.addEventListener('blur', escreverTempo);
  inM.addEventListener('blur', escreverTempo);
  inPerda.addEventListener('input', () => { p.perdaPct = Math.max(0, parseNum(inPerda.value)); mudou(); });

  root.addEventListener('click', (e) => {
    const st = e.target.closest('[data-step]');
    if (st) {
      const [k, d] = st.dataset.step.split(':');
      const delta = +d;
      if (k === 'h') p.tempoMin = Math.max(0, (p.tempoMin || 0) + delta * 60);
      if (k === 'm') p.tempoMin = Math.max(0, (p.tempoMin || 0) + delta);
      if (k === 'p') { p.perdaPct = Math.max(0, Math.round((p.perdaPct || 0) + delta)); inPerda.value = num(p.perdaPct, 1); }
      if (k !== 'p') escreverTempo();
      mudou();
      return;
    }
    const tp = e.target.closest('[data-tempo]');
    if (tp) { p.tempoMin = +tp.dataset.tempo; escreverTempo(); mudou(); }
  });

  root.querySelectorAll('input[name=hora]').forEach((r) => r.addEventListener('change', () => {
    const propria = r.value === 'propria' && r.checked;
    $('[data-hora-wrap]').hidden = !propria;
    p.horaPropria = propria ? parseNum($('[data-hora]').value) : null;
    if (propria) setTimeout(() => $('[data-hora]').focus(), 30);
    mudou();
  }));
  $('[data-hora]').addEventListener('input', (e) => { p.horaPropria = parseNum(e.target.value); mudou(); });

  root.querySelectorAll('[data-frete]').forEach((inp) => inp.addEventListener('input', () => {
    p.frete[inp.dataset.frete] = parseNum(inp.value);
    mudou();
  }));

  /* ---------- sanfonas ---------- */
  root.addEventListener('toggle', (e) => {
    const k = e.target.dataset?.acc;
    if (!k) return;
    if (e.target.open) abertos.add(k); else abertos.delete(k);
  }, true);

  /* ---------- simulador ---------- */
  $('[data-sim]').addEventListener('input', (e) => { simValor = e.target.value; renderSim(calcularProduto(p, mapaMateriais(), cfg)); });

  /* ---------- topo: duplicar / excluir ---------- */
  $('[data-dup]').addEventListener('click', async () => {
    salvar.flush();
    const c = await duplicarProduto(p);
    toast('Produto duplicado — agora você está na cópia');
    location.hash = `#/produto/${c.id}`;
  });
  $('[data-del]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Excluir produto?',
      message: `<b>${esc(p.nome || 'Este produto')}</b> será excluído definitivamente. Os insumos continuam cadastrados.`,
      ok: 'Excluir', danger: true,
    });
    if (!ok) return;
    excluido = true;
    await excluirProduto(p.id);
    toast('Produto excluído');
    location.hash = '#/';
  });

  /* ---------- cálculos e resultados ---------- */
  function estadoSalvo(ok) {
    const el = $('[data-save-state]');
    if (!el) return;
    el.classList.toggle('saving', !ok);
    el.innerHTML = ok ? `${icon('check')} Salvo` : 'Salvando…';
  }

  function atualizar() {
    if (!insEl.isConnected) return;
    const c = calcularProduto(p, mapaMateriais(), cfg);
    $('[data-tot-mat]').textContent = brl(c.materiais + c.perda);
    $('[data-tot-mo]').textContent = brl(c.maoDeObra);
    $('[data-mo-txt]').textContent = `${fmtTempo(c.tempoMin)} × ${brl(c.valorHora)}/h`;
    $('[data-mo-val]').textContent = brl(c.maoDeObra);
    $('[data-resultados]').innerHTML = htmlResultados(c);
    const dock = $('[data-dock]');
    dock.innerHTML = htmlDock(c);
    dock.classList.toggle('vazio', !dock.innerHTML);
    renderSim(c);
  }

  function htmlResultados(c) {
    const head = `<p class="hint">O menor preço para você receber <b>${brl(c.valorHora)} por hora</b>, já descontadas as taxas. Toque em um canal para ver o cálculo.</p>`;
    if (c.alvo <= 0) {
      return `${head}<div class="results-empty"><b>Quase lá!</b>Adicione os insumos e o tempo de produção para ver os preços.</div>`;
    }
    const aviso = !c.linhas.length ? 'Nenhum insumo adicionado ainda.' : !c.tempoMin ? 'O tempo de produção está zerado.' : '';
    return `${head}
      ${aviso ? `<div class="ch-warn" style="margin-bottom:12px">${icon('alert')}<span>${aviso}</span></div>` : ''}
      <div class="sum-line">
        <span>Materiais${c.perda ? ' + perda' : ''} <b>${brl(c.materiais + c.perda)}</b></span><i>+</i>
        <span>Mão de obra <b>${brl(c.maoDeObra)}</b></span>${c.das ? `<i>+</i><span>DAS <b>${brl(c.das)}</b></span>` : ''}<i>=</i>
        <span class="target">Precisa sobrar <b>${brl(c.alvo)}</b></span>
      </div>
      <div class="ch-rows">${c.canais.map((x) => htmlCanal(c, x)).join('') || '<p class="muted">Nenhum canal ativo. Ative em Ajustes.</p>'}</div>`;
  }

  function htmlCanal(c, x) {
    const { canal, min, sugerido, recSug, faltaFrete } = x;
    if (!min) {
      return `<div class="ch-row c-${canal.id} off"><div class="ch-sum"><span class="ch-name"><span class="ch-dot"></span><b>${esc(canal.nome)}</b>
        <small>Não foi possível calcular — confira as taxas em Ajustes.</small></span></div></div>`;
    }
    const mostraSug = cfg.arredondar && sugerido != null && Math.abs(sugerido - min.preco) > 0.001;
    const key = `det-${canal.id}`;
    return `
    <details class="ch-row c-${canal.id}" data-acc="${key}" ${abertos.has(key) ? 'open' : ''}>
      <summary class="ch-sum">
        <span class="ch-name"><span class="ch-dot"></span><b>${esc(canal.nome)}</b>
          <small>${textoFaixa(min.faixa, min.ate)}</small></span>
        <span class="ch-val main"><small>Preço mínimo</small><b>${brl(min.preco)}</b></span>
        <span class="ch-val sug"><small>Sugestão</small><b>${mostraSug ? brl(sugerido) : '—'}</b></span>
        <span class="ch-val rec"><small>Você recebe</small><b>${brl(min.liquido)}</b></span>
        ${icon('chev', 'chev')}
        ${faltaFrete ? `<span class="ch-flag">${icon('alert')} Informe o frete que você paga neste canal</span>` : ''}
      </summary>
      <div class="ch-body">
        <div class="ch-mini">
          <span>Taxas: <b>${brl(min.taxas)}</b> (${num((min.taxas / min.preco) * 100, 1)}% do preço)</span>
          ${mostraSug ? `<span>Anunciando pela sugestão você recebe <b>${brl(recSug.liquido)}</b></span>` : ''}
        </div>
        ${faltaFrete ? `<div class="ch-warn">${icon('alert')}<span>Nesta faixa de preço você paga parte do frete. Informe o valor em <b>Frete que você paga</b> para o cálculo ficar certo.</span></div>` : ''}
        ${recibo(c, x, mostraSug ? recSug : null)}
      </div>
    </details>`;
  }

  function htmlDock(c) {
    if (c.alvo <= 0 || !c.canais.length) return '';
    return `<span class="dock-label">Preço mínimo</span>
      ${c.canais.map(({ canal, min }) => `<span class="dock-ch c-${canal.id}"><small><i class="ch-dot"></i>${NOMES_CURTOS[canal.id] || esc(canal.nome)}</small><b>${min ? brl(min.preco) : '—'}</b></span>`).join('')}
      ${icon('chev', 'dock-chev')}`;
  }

  function recibo(c, x, recSug) {
    const { canal, min } = x;
    const l = (rotuloTxt, valor, cls = '') => `<div class="r-line ${cls}"><span>${rotuloTxt}</span><b>${valor}</b></div>`;
    const pct = min.faixa.pct || 0;
    const sobra = min.liquido - c.custosDiretos;
    const porHora = c.horas > 0 ? sobra / c.horas : 0;
    return `<div class="receipt">
      <h4>1 · O que precisa sobrar para você</h4>
      ${l(`Materiais <em>(${c.linhas.length} insumo${c.linhas.length === 1 ? '' : 's'})</em>`, brl(c.materiais))}
      ${c.perda ? l(`Perda e desperdício <em>(${num(c.perdaPct, 1)}% dos materiais)</em>`, brl(c.perda)) : ''}
      ${l(`Mão de obra <em>(${fmtTempo(c.tempoMin)} × ${brl(c.valorHora)}/h)</em>`, brl(c.maoDeObra))}
      ${c.das ? l(`Imposto MEI (DAS) <em>(${brl(cfg.das.valor)} ÷ ${cfg.das.vendasMes} vendas/mês)</em>`, brl(c.das)) : ''}
      ${min.frete ? l('Frete pago por você', brl(min.frete)) : ''}
      ${l('Valor necessário', brl(min.necessario), 'sum')}

      <h4>2 · Taxas do ${esc(canal.nome)}</h4>
      ${l('Faixa de preço aplicada', textoFaixa(min.faixa, min.ate))}
      ${l('Comissão sobre o preço', `${num(pct, 2)}%`)}
      ${l('Taxa fixa por venda', brl(min.fixa))}
      ${min.faixa.frete && canal.id !== 'ecommerce' ? l('Você paga frete nesta faixa?', 'Sim') : ''}

      <h4>3 · A conta do preço</h4>
      <div class="formula">
        Preço = (valor necessário + taxa fixa) ÷ (1 − comissão)<br>
        <code>(${brl(min.necessario)} + ${brl(min.fixa)}) ÷ (1 − ${num(pct, 2)}%) = ${brl(min.bruto)}</code><br>
        ${min.elevado
          ? `Esse valor cairia numa faixa de preço mais barata, onde as taxas são outras. Por isso o menor preço possível é o início desta faixa: <code>${brl(min.preco)}</code>.`
          : `Arredondado para cima, centavo a centavo: <code>${brl(min.preco)}</code>.`}
      </div>

      <h4>4 · Conferindo: vendendo a ${brl(min.preco)}</h4>
      ${l('Preço de venda', brl(min.preco))}
      ${l(`Comissão (${num(pct, 2)}%)`, `− ${brl(min.comissao)}`, 'minus')}
      ${min.fixa ? l('Taxa fixa', `− ${brl(min.fixa)}`, 'minus') : ''}
      ${min.frete ? l('Frete', `− ${brl(min.frete)}`, 'minus') : ''}
      ${l('Você recebe', brl(min.liquido), 'sum')}
      ${l(`Materiais${c.perda ? ' + perda' : ''}${c.das ? ' + DAS' : ''}`, `− ${brl(c.custosDiretos)}`, 'minus')}
      ${l('Sobra para o seu trabalho', brl(sobra), 'sum')}
      <div class="check">${icon('check')}<span>${c.horas > 0
        ? `Isso equivale a <b>${brl(porHora)} por hora</b> — sua meta é ${brl(c.valorHora)}/h.`
        : 'Informe o tempo de produção para ver o valor por hora.'}
        ${recSug && c.horas > 0 ? `<br>Anunciando pela sugestão de <b>${brl(recSug.preco)}</b>, você ganha <b>${brl((recSug.liquido - c.custosDiretos) / c.horas)} por hora</b>.` : ''}</span></div>
    </div>`;
  }

  function renderSim(c) {
    const tab = $('[data-sim-tab]');
    if (!tab) return;
    const v = parseNum(simValor);
    if (!(v > 0)) {
      tab.innerHTML = `<p class="hint" style="margin:0">Digite um preço para ver quanto você ganharia por hora em cada canal.</p>`;
      return;
    }
    const linhas = simular(v, c);
    tab.innerHTML = `<table class="sim-table">
      <thead><tr><th>Canal</th><th>Recebe</th><th>Sobra p/ você</th><th>Por hora</th></tr></thead>
      <tbody>${linhas.map((r) => `
        <tr class="c-${r.canal.id}">
          <td><span class="ch-dot"></span>${esc(r.canal.nome)}</td>
          <td>${brl(r.liquido)}</td>
          <td>${brl(r.sobra)}</td>
          <td><span class="tag ${r.ok ? 'ok' : 'bad'}">${c.horas > 0 ? brl(r.porHora) : '—'}</span></td>
        </tr>`).join('')}</tbody></table>
      <p class="note">Verde: atinge sua meta de ${brl(c.valorHora)}/h. Vermelho: fica abaixo.</p>`;
  }

  renderInsumos();
  atualizar();

  // Barra de preços no rodapé: aparece enquanto a seção de preços está fora da tela.
  const dock = $('[data-dock]');
  dock.addEventListener('click', () => $('#precos').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const obs = new IntersectionObserver(([e]) => { dock.hidden = e.isIntersecting; }, { rootMargin: '0px 0px -80px 0px' });
  obs.observe($('#precos'));

  // Ao sair da tela ou fechar o app, garante que a última alteração foi salva.
  const aoOcultar = () => { if (document.visibilityState === 'hidden') salvar.flush(); };
  document.addEventListener('visibilitychange', aoOcultar);
  return () => {
    obs.disconnect();
    document.removeEventListener('visibilitychange', aoOcultar);
    if (!excluido) salvar.flush();
  };
}

/** Lista de insumos para escolher (ou cadastrar um novo na hora). */
async function escolherInsumo(p) {
  const usados = new Set(p.insumos.map((i) => i.materialId));
  const modal = openModal({
    title: 'Adicionar insumo',
    body: `
      <label class="search" style="max-width:none">${icon('search')}<span class="sr-only">Buscar</span>
        <input class="inp" type="search" data-q placeholder="Buscar insumo…" autocomplete="off"></label>
      <div class="pick-list" data-list></div>`,
    foot: `<button class="btn dashed block" data-novo-mat>${icon('plus')} Cadastrar novo insumo</button>`,
    onOpen: (el, close) => {
      const q = el.querySelector('[data-q]');
      const list = el.querySelector('[data-list]');
      const render = () => {
        const t = q.value.trim().toLocaleLowerCase('pt-BR');
        const mats = state.materiais
          .filter((m) => !t || m.nome.toLocaleLowerCase('pt-BR').includes(t))
          .sort((a, b) => (usados.has(a.id) - usados.has(b.id)) || a.nome.localeCompare(b.nome, 'pt-BR'));
        list.innerHTML = mats.length
          ? mats.map((m) => `<button type="button" class="pick" data-mid="${m.id}" ${usados.has(m.id) ? 'disabled' : ''}>
              <div><b>${esc(m.nome)}</b><small>${usados.has(m.id) ? 'Já está neste produto' : textoCustoUnitario(m)}</small></div>
              ${usados.has(m.id) ? icon('check') : icon('plus')}</button>`).join('')
          : `<p class="muted" style="text-align:center;margin:12px 0">${state.materiais.length
            ? 'Nenhum insumo com esse nome.' : 'Você ainda não cadastrou insumos. Cadastre o primeiro abaixo.'}</p>`;
      };
      render();
      q.addEventListener('input', render);
      list.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mid]');
        if (b && !b.disabled) close({ id: b.dataset.mid });
      });
      el.querySelector('[data-novo-mat]').addEventListener('click', () => close({ novo: q.value.trim() }));
      if (state.materiais.length > 6) setTimeout(() => q.focus(), 60);
    },
  });
  const r = await modal.done;
  if (!r) return null;
  if (r.novo !== undefined) {
    const res = await abrirFormMaterial(null, { nomeInicial: r.novo });
    return res?.acao === 'salvo' ? res.mat : null;
  }
  return state.materiais.find((m) => m.id === r.id) || null;
}
