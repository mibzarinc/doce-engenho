// Motor de cálculo: custo dos insumos, mão de obra e preço mínimo por canal.
//
// Ideia central: o preço é calculado "de trás para frente". Primeiro somamos o
// que precisa sobrar (materiais + perda + horas × valor da hora + DAS opcional
// + frete que ela paga). Depois descobrimos o menor preço que, descontadas as
// taxas do canal, entrega exatamente esse valor:
//
//     preço = (valor necessário + taxa fixa) ÷ (1 − comissão%)
//
// Como as taxas mudam por faixa de preço (ex.: Shopee, ML acima de R$ 79),
// testamos cada faixa e ficamos com o menor preço válido.

export const UNIDADES = {
  m: { rotulo: 'm', nome: 'metro', fam: 'comp', f: 100 },
  cm: { rotulo: 'cm', nome: 'centímetro', fam: 'comp', f: 1 },
  kg: { rotulo: 'kg', nome: 'quilo', fam: 'massa', f: 1000 },
  g: { rotulo: 'g', nome: 'grama', fam: 'massa', f: 1 },
  l: { rotulo: 'L', nome: 'litro', fam: 'vol', f: 1000 },
  ml: { rotulo: 'ml', nome: 'mililitro', fam: 'vol', f: 1 },
  un: { rotulo: 'un', nome: 'unidade', fam: 'un', f: 1 },
  par: { rotulo: 'par', nome: 'par', fam: 'par', f: 1 },
  folha: { rotulo: 'folha', nome: 'folha', fam: 'folha', f: 1 },
  novelo: { rotulo: 'novelo', nome: 'novelo', fam: 'novelo', f: 1 },
  rolo: { rotulo: 'rolo', nome: 'rolo', fam: 'rolo', f: 1 },
  pacote: { rotulo: 'pacote', nome: 'pacote', fam: 'pacote', f: 1 },
  tubo: { rotulo: 'tubo', nome: 'tubo', fam: 'tubo', f: 1 },
  frasco: { rotulo: 'frasco', nome: 'frasco', fam: 'frasco', f: 1 },
};

export const GRUPOS_UNIDADES = [
  ['Comprimento', ['m', 'cm']],
  ['Peso', ['kg', 'g']],
  ['Volume', ['l', 'ml']],
  ['Contagem', ['un', 'par', 'folha', 'novelo', 'rolo', 'pacote', 'tubo', 'frasco']],
];

export const rotulo = (u) => UNIDADES[u]?.rotulo ?? u;

/** Unidades em que um insumo pode ser usado (ex.: comprado em metro, usado em cm). */
export function unidadesCompativeis(u) {
  const fam = UNIDADES[u]?.fam;
  return Object.keys(UNIDADES).filter((k) => UNIDADES[k].fam === fam);
}

/** Menor unidade da família (cm, g, ml) — usada para mostrar o custo unitário. */
export function unidadeBase(u) {
  const fam = UNIDADES[u]?.fam;
  return Object.keys(UNIDADES).find((k) => UNIDADES[k].fam === fam && UNIDADES[k].f === 1) || u;
}

/** Custo de 1 unidade-base (1 cm, 1 g, 1 un…) do material. */
export function custoPorBase(mat) {
  const u = UNIDADES[mat.unidade];
  const qtd = (mat.qtd || 0) * (u?.f || 1);
  return qtd > 0 ? (mat.preco || 0) / qtd : 0;
}

export function custoPorUnidade(mat, unidade) {
  return custoPorBase(mat) * (UNIDADES[unidade]?.f || 1);
}

export function custoInsumo(item, mat) {
  if (!mat) return 0;
  const uu = UNIDADES[item.unidade] ? item.unidade : mat.unidade;
  if (UNIDADES[uu]?.fam !== UNIDADES[mat.unidade]?.fam) return 0;
  return (item.qtd || 0) * custoPorUnidade(mat, uu);
}

const centavoAcima = (v) => Math.ceil(v * 100 - 1e-6) / 100;
const r2 = (v) => Math.round(v * 100) / 100;

export function faixasOrdenadas(canal) {
  return [...(canal.faixas || [])].sort((a, b) => (a.min || 0) - (b.min || 0));
}

/** Quanto ela recebe vendendo a `preco` neste canal. */
export function receber(preco, canal, frete = 0) {
  const fx = faixasOrdenadas(canal);
  let idx = 0;
  fx.forEach((f, i) => { if (preco >= (f.min || 0) - 1e-9) idx = i; });
  const faixa = fx[idx] || { min: 0, pct: 0, fixa: 0, frete: false };
  const comissao = preco * (faixa.pct || 0) / 100;
  const fixa = faixa.fixa || 0;
  const fretePago = faixa.frete ? (frete || 0) : 0;
  const taxas = comissao + fixa + fretePago;
  return { preco, idx, faixa, ate: fx[idx + 1]?.min ?? null, comissao, fixa, frete: fretePago, taxas, liquido: preco - taxas };
}

/** Menor preço (em centavos inteiros) que garante receber `alvo` neste canal. */
export function precoMinimo(alvo, canal, frete = 0) {
  const fx = faixasOrdenadas(canal);
  let best = null;
  fx.forEach((f, i) => {
    const lo = f.min || 0;
    const hi = fx[i + 1]?.min ?? Infinity;
    const pct = Math.min(f.pct || 0, 95) / 100;
    const necessario = alvo + (f.frete ? (frete || 0) : 0);
    const bruto = (necessario + (f.fixa || 0)) / (1 - pct);
    const preco = centavoAcima(Math.max(bruto, lo));
    if (preco < hi - 1e-9 && (!best || preco < best.preco)) {
      best = { preco, bruto, elevado: bruto < lo - 1e-9, necessario };
    }
  });
  if (!best) return null;
  return { ...best, ...receber(best.preco, canal, frete) };
}

/** Preço "redondo" (terminado em ,90) que ainda garante o alvo. */
export function precoSugerido(min, alvo, canal, frete = 0) {
  let p = Math.floor(min) + 0.9;
  if (p < min - 1e-9) p += 1;
  for (let k = 0; k < 2000; k++) {
    if (receber(p, canal, frete).liquido >= alvo - 0.005) return r2(p);
    p += 1;
  }
  return min;
}

/**
 * Cálculo completo de um produto.
 * @returns base (custos) + resultado por canal ativo.
 */
export function calcularProduto(produto, mapaMateriais, cfg) {
  const linhas = (produto.insumos || []).map((it) => {
    const mat = mapaMateriais.get(it.materialId);
    return { ...it, mat, custo: custoInsumo(it, mat) };
  });
  const materiais = linhas.reduce((s, l) => s + l.custo, 0);
  const perdaPct = produto.perdaPct || 0;
  const perda = materiais * perdaPct / 100;
  const tempoMin = produto.tempoMin || 0;
  const horas = tempoMin / 60;
  const usaHoraPropria = produto.horaPropria != null;
  const valorHora = usaHoraPropria ? produto.horaPropria : (cfg.horaPadrao || 0);
  const maoDeObra = horas * valorHora;
  const das = cfg.das?.ativo ? (cfg.das.valor || 0) / Math.max(1, cfg.das.vendasMes || 1) : 0;
  const custosDiretos = materiais + perda + das; // tudo o que não é a hora dela
  const alvo = custosDiretos + maoDeObra; // o que precisa sobrar (antes do frete)
  const completo = linhas.length > 0 && tempoMin > 0;

  const canais = (cfg.canais || []).filter((c) => c.ativo).map((canal) => {
    const frete = produto.frete?.[canal.id] || 0;
    const min = precoMinimo(alvo, canal, frete);
    const sugerido = min ? precoSugerido(min.preco, alvo, canal, frete) : null;
    const recSug = sugerido != null ? receber(sugerido, canal, frete) : null;
    // Faixas em que ela paga frete mas o valor está zerado → avisar.
    const faltaFrete = !!(min?.faixa?.frete && !frete && canal.id !== 'ecommerce');
    return { canal, frete, min, sugerido, recSug, faltaFrete };
  });

  return {
    linhas, materiais, perdaPct, perda, tempoMin, horas, valorHora, usaHoraPropria,
    maoDeObra, das, custosDiretos, alvo, completo, canais,
  };
}

/** Simulação: vendendo a `preco`, quanto ela ganha por hora em cada canal. */
export function simular(preco, calc) {
  return calc.canais.map(({ canal, frete }) => {
    const r = receber(preco, canal, frete);
    const sobra = r.liquido - calc.custosDiretos;
    const porHora = calc.horas > 0 ? sobra / calc.horas : 0;
    return { canal, ...r, sobra, porHora, ok: r.liquido >= calc.alvo - 0.005 };
  });
}
