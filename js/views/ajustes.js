// Ajustes: valor da hora, taxas dos canais, DAS do MEI e backup.

import { state, salvarCfg, restaurarCanal, exportar, importar, marcarBackup, categorias } from '../store.js';
import { abrirCategorias } from './categorias.js';
import { faixasOrdenadas } from '../calc.js';
import {
  esc, brl, num, fixo, parseNum, icon, toast, debounce, confirmDialog, escolherArquivo, fmtData, autoSelect,
} from '../ui.js';

export function renderAjustes(root) {
  const cfg = state.cfg;
  const salvar = debounce(async () => { await salvarCfg(); toast('Ajustes salvos', { ms: 1400 }); }, 700);

  root.innerHTML = `
    <div class="page-head">
      <div><h1>Ajustes</h1>
        <p class="lead">Valores usados em todos os cálculos. Tudo é salvo automaticamente.</p></div>
    </div>

    <div class="settings">
      <section class="card section">
        <div class="section-head"><span class="step">${icon('clock')}</span><h2>Sua hora de trabalho</h2></div>
        <p class="hint">Quanto você quer ganhar por hora. Os preços são calculados para garantir este valor.</p>
        <label class="field"><span>Valor padrão da hora</span>
          <div class="inp-group" style="max-width:280px"><span>R$</span>
            <input class="inp" data-hora inputmode="decimal" value="${fixo(cfg.horaPadrao)}"><span>/hora</span></div></label>
        <div class="helper">
          <p>Não sabe quanto cobrar? Calcule:</p>
          <div class="grid-2">
            <label class="field"><small>Quero ganhar por mês</small>
              <div class="inp-group"><span>R$</span><input class="inp" data-renda inputmode="decimal" placeholder="2.000,00"></div></label>
            <label class="field"><small>Horas de trabalho por semana</small>
              <div class="inp-group"><input class="inp" data-horas-sem inputmode="decimal" placeholder="25"><span>h</span></div></label>
          </div>
          <div class="res"><span>Sua hora: <b data-sug-hora>—</b></span>
            <button class="btn small soft" data-usar-hora disabled>${icon('check')} Usar este valor</button></div>
        </div>
      </section>

      <div style="display:flex;flex-direction:column;gap:18px">
        <section class="card section">
          <div class="section-head"><span class="step">${icon('sparkle')}</span><h2>Preço sugerido</h2></div>
          <div class="row-between">
            <span>Sugerir preços “redondos”, terminados em <b>,90</b> (ex.: ${brl(47.9)}), sempre acima do mínimo.</span>
            <label class="toggle"><input type="checkbox" data-arred ${cfg.arredondar ? 'checked' : ''}><span class="track"></span><span class="sr-only">Ativar</span></label>
          </div>
        </section>

        <section class="card section">
          <div class="section-head"><span class="step">${icon('coins')}</span><h2>Imposto MEI (DAS)</h2>
            <label class="toggle" style="margin-left:auto"><input type="checkbox" data-das-ativo ${cfg.das.ativo ? 'checked' : ''}><span class="track"></span><span class="sr-only">Incluir DAS no preço</span></label></div>
          <p class="hint">Opcional. O DAS é um valor fixo por mês. Se ligado, ele é dividido entre as vendas do mês e somado a cada produto.</p>
          <div class="grid-2" data-das-campos ${cfg.das.ativo ? '' : 'hidden'}>
            <label class="field"><small>Valor mensal do DAS</small>
              <div class="inp-group"><span>R$</span><input class="inp" data-das-valor inputmode="decimal" value="${fixo(cfg.das.valor)}"></div></label>
            <label class="field"><small>Vendas estimadas por mês</small>
              <div class="inp-group"><input class="inp" data-das-vendas inputmode="numeric" value="${cfg.das.vendasMes}"><span>vendas</span></div></label>
          </div>
          <p class="note" data-das-res></p>
        </section>

        <section class="card section">
          <div class="section-head"><span class="step">${icon('grid')}</span><h2>Categorias</h2>
            <button class="btn small soft" style="margin-left:auto" data-cats-edit>${icon('edit')} Editar</button></div>
          <div class="chips" data-cats-lista></div>
        </section>
      </div>

      <section class="card section full">
        <div class="section-head"><span class="step">${icon('coins')}</span><h2>Canais de venda e taxas</h2></div>
        <p class="hint">Valores de referência de novembro/2026. As plataformas mudam as taxas com frequência — confira na sua conta de vendedor e ajuste aqui. Cada linha é uma <b>faixa de preço</b>: a taxa vale a partir daquele valor até o início da próxima faixa.</p>
        <div class="ch-settings" data-canais></div>
      </section>

      <section class="card section full" id="backup">
        <div class="section-head"><span class="step">${icon('shield')}</span><h2>Backup dos dados</h2></div>
        <p class="hint">Seus dados ficam guardados só neste tablet. Faça um backup de vez em quando e guarde o arquivo no Google Drive, e-mail ou WhatsApp. Se trocar de aparelho, é só importar.</p>
        <p style="margin:0;font-weight:700" data-ultimo></p>
        <div class="backup-actions">
          <button class="btn primary" data-exportar>${icon('download')} Baixar backup</button>
          <button class="btn soft" data-compartilhar hidden>${icon('share')} Enviar backup…</button>
          <button class="btn" data-importar>${icon('upload')} Restaurar um backup</button>
        </div>
      </section>
    </div>`;

  const $ = (s) => root.querySelector(s);
  autoSelect(root);

  /* ---------- hora ---------- */
  $('[data-hora]').addEventListener('input', (e) => { cfg.horaPadrao = parseNum(e.target.value); salvar(); });
  const calcHora = () => {
    const renda = parseNum($('[data-renda]').value), hs = parseNum($('[data-horas-sem]').value);
    const v = renda > 0 && hs > 0 ? renda / (hs * 4.33) : 0;
    $('[data-sug-hora]').textContent = v ? `${brl(v)}/h` : '—';
    $('[data-usar-hora]').disabled = !v;
    return v;
  };
  $('[data-renda]').addEventListener('input', calcHora);
  $('[data-horas-sem]').addEventListener('input', calcHora);
  $('[data-usar-hora]').addEventListener('click', () => {
    const v = Math.round(calcHora() * 100) / 100;
    cfg.horaPadrao = v;
    $('[data-hora]').value = fixo(v);
    salvar();
  });

  /* ---------- categorias ---------- */
  const renderCats = () => {
    const cats = categorias();
    $('[data-cats-lista]').innerHTML = cats.length
      ? cats.map((c) => `<span class="chip">${esc(c)}</span>`).join('')
      : '<span class="muted">Nenhuma categoria cadastrada.</span>';
  };
  renderCats();
  $('[data-cats-edit]').addEventListener('click', () => abrirCategorias().then(renderCats));

  /* ---------- arredondar / DAS ---------- */
  $('[data-arred]').addEventListener('change', (e) => { cfg.arredondar = e.target.checked; salvar(); });
  const dasRes = () => {
    $('[data-das-res]').textContent = cfg.das.ativo
      ? `= ${brl(cfg.das.valor / Math.max(1, cfg.das.vendasMes))} somados a cada produto vendido. Confira o valor no seu boleto do DAS.`
      : 'Desligado: o DAS não entra no preço.';
  };
  $('[data-das-ativo]').addEventListener('change', (e) => {
    cfg.das.ativo = e.target.checked;
    $('[data-das-campos]').hidden = !cfg.das.ativo;
    dasRes(); salvar();
  });
  $('[data-das-valor]').addEventListener('input', (e) => { cfg.das.valor = parseNum(e.target.value); dasRes(); salvar(); });
  $('[data-das-vendas]').addEventListener('input', (e) => { cfg.das.vendasMes = Math.max(1, Math.round(parseNum(e.target.value))); dasRes(); salvar(); });
  dasRes();

  /* ---------- canais ---------- */
  const canaisEl = $('[data-canais]');
  const renderCanais = () => {
    canaisEl.innerHTML = cfg.canais.map((c) => {
      const fx = faixasOrdenadas(c);
      c.faixas = fx;
      return `<div class="ch-set c-${c.id}" data-canal="${c.id}">
        <header><span class="ch-dot"></span><b>${esc(c.nome)}</b>
          <label class="toggle"><input type="checkbox" data-ativo ${c.ativo ? 'checked' : ''}><span class="track"></span><span class="sr-only">Canal ativo</span></label></header>
        <div class="body">
          <p class="desc">${esc(c.descricao)}</p>
          <table class="tiers">
            <thead><tr><th>A partir de R$</th><th>Comissão %</th><th>Taxa fixa R$</th><th title="Você paga frete nesta faixa?">Frete</th><th></th></tr></thead>
            <tbody>${fx.map((f, i) => `
              <tr data-fx="${i}">
                <td><input class="inp num" data-k="min" inputmode="decimal" value="${fixo(f.min || 0)}" ${i === 0 ? 'disabled' : ''} aria-label="Preço inicial da faixa"></td>
                <td><input class="inp num" data-k="pct" inputmode="decimal" value="${num(f.pct, 2)}" aria-label="Comissão em %"></td>
                <td><input class="inp num" data-k="fixa" inputmode="decimal" value="${fixo(f.fixa || 0)}" aria-label="Taxa fixa em R$"></td>
                <td><label class="toggle"><input type="checkbox" data-k="frete" ${f.frete ? 'checked' : ''}><span class="track"></span><span class="sr-only">Você paga frete</span></label></td>
                <td>${i > 0 ? `<button class="icon-btn danger" data-rm-fx aria-label="Remover faixa">${icon('x')}</button>` : ''}</td>
              </tr>`).join('')}</tbody>
          </table>
          <p class="note">Comissão em %, taxa fixa em R$. “Frete” ligado = você paga o frete do produto nesta faixa.</p>
          <div class="tier-actions">
            <button class="btn small soft" data-add-fx>${icon('plus')} Faixa</button>
            <button class="btn small ghost" data-reset>Restaurar padrão</button>
          </div>
        </div>
      </div>`;
    }).join('');
  };
  renderCanais();

  const canalDe = (el) => cfg.canais.find((c) => c.id === el.closest('[data-canal]')?.dataset.canal);
  canaisEl.addEventListener('input', (e) => {
    const c = canalDe(e.target), tr = e.target.closest('[data-fx]');
    if (!c || !tr || e.target.type === 'checkbox') return;
    c.faixas[+tr.dataset.fx][e.target.dataset.k] = parseNum(e.target.value);
    salvar();
  });
  canaisEl.addEventListener('change', (e) => {
    const c = canalDe(e.target);
    if (!c) return;
    if (e.target.matches('[data-ativo]')) { c.ativo = e.target.checked; salvar(); return; }
    if (e.target.matches('[data-k="frete"]')) { c.faixas[+e.target.closest('[data-fx]').dataset.fx].frete = e.target.checked; salvar(); return; }
    if (e.target.matches('[data-k="min"]')) { renderCanais(); } // reordena as faixas
  });
  canaisEl.addEventListener('click', async (e) => {
    const c = canalDe(e.target);
    if (!c) return;
    if (e.target.closest('[data-rm-fx]')) {
      c.faixas.splice(+e.target.closest('[data-fx]').dataset.fx, 1);
      renderCanais(); salvar();
    } else if (e.target.closest('[data-add-fx]')) {
      const ult = c.faixas[c.faixas.length - 1];
      c.faixas.push({ min: Math.round((ult?.min || 0) + 50), pct: ult?.pct || 0, fixa: ult?.fixa || 0, frete: !!ult?.frete });
      renderCanais(); salvar();
    } else if (e.target.closest('[data-reset]')) {
      const ok = await confirmDialog({ title: `Restaurar ${c.nome}?`, message: 'As taxas voltam aos valores de referência do aplicativo.', ok: 'Restaurar' });
      if (!ok) return;
      await restaurarCanal(c.id);
      renderCanais();
      toast('Taxas restauradas');
    }
  });

  /* ---------- backup ---------- */
  const ultimo = () => {
    $('[data-ultimo]').innerHTML = cfg.ultimoBackup
      ? `${icon('check')} Último backup: ${fmtData(cfg.ultimoBackup)}`
      : `${icon('alert')} Nenhum backup feito ainda.`;
  };
  ultimo();

  const arquivoBackup = () => {
    const nome = `doce-engenho-backup-${new Date().toISOString().slice(0, 10)}.json`;
    return new File([JSON.stringify(exportar())], nome, { type: 'application/json' });
  };
  $('[data-exportar]').addEventListener('click', async () => {
    const f = arquivoBackup();
    const url = URL.createObjectURL(f);
    const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    await marcarBackup(); ultimo();
    toast('Backup baixado');
  });
  const share = $('[data-compartilhar]');
  try { share.hidden = !(navigator.canShare && navigator.canShare({ files: [arquivoBackup()] })); } catch { share.hidden = true; }
  share.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [arquivoBackup()], title: 'Backup Doce Engenho' });
      await marcarBackup(); ultimo();
    } catch { /* cancelado */ }
  });
  $('[data-importar]').addEventListener('click', async () => {
    const f = await escolherArquivo('application/json,.json');
    if (!f) return;
    let dados;
    try { dados = JSON.parse(await f.text()); } catch { toast('Arquivo inválido'); return; }
    const ok = await confirmDialog({
      title: 'Restaurar backup?',
      message: `Todos os dados atuais serão <b>substituídos</b> pelos do arquivo <b>${esc(f.name)}</b>${dados?.produtos ? ` (${dados.produtos.length} produtos, ${dados.materiais?.length || 0} insumos)` : ''}.`,
      ok: 'Restaurar', danger: true,
    });
    if (!ok) return;
    try {
      await importar(dados);
      toast('Backup restaurado');
      location.hash = '#/';
    } catch (err) {
      toast(err.message || 'Não foi possível restaurar');
    }
  });

  if (location.hash.includes('backup')) setTimeout(() => $('#backup').scrollIntoView({ behavior: 'smooth' }), 100);

  return () => salvar.flush();
}
