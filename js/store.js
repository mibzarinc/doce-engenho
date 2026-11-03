// Estado em memória + gravação no banco local.

import { db } from './db.js';
import { CONFIG_PADRAO, CANAIS_PADRAO, exemplo } from './defaults.js';
import { uid } from './ui.js';

export const state = {
  produtos: [],
  materiais: [],
  cfg: structuredClone(CONFIG_PADRAO),
};

/** Mescla configurações salvas com os padrões (para campos novos em versões futuras). */
function mesclarCfg(salva) {
  const cfg = { ...structuredClone(CONFIG_PADRAO), ...(salva || {}) };
  cfg.das = { ...CONFIG_PADRAO.das, ...(salva?.das || {}) };
  if (!Array.isArray(cfg.categorias)) cfg.categorias = [...CONFIG_PADRAO.categorias];
  const salvos = new Map((salva?.canais || []).map((c) => [c.id, c]));
  cfg.canais = CANAIS_PADRAO.map((p) => ({ ...structuredClone(p), ...(salvos.get(p.id) || {}) }));
  return cfg;
}

export async function carregar() {
  const [produtos, materiais, cfg] = await Promise.all([
    db.all('produtos'), db.all('materiais'), db.get('config', 'settings'),
  ]);
  state.produtos = produtos || [];
  state.materiais = materiais || [];
  state.cfg = mesclarCfg(cfg);
}

export const mapaMateriais = () => new Map(state.materiais.map((m) => [m.id, m]));

/* ---------- Categorias ---------- */
const ordenar = (lista) => lista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
const mesmoNome = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;

/** Todas as categorias cadastradas (inclui alguma usada em produto e ainda fora da lista). */
export function categorias() {
  const lista = [...state.cfg.categorias];
  for (const c of categoriasEmUso()) if (!lista.some((x) => mesmoNome(x, c))) lista.push(c);
  return ordenar(lista);
}

/** Só as categorias que têm produto — usadas nos filtros do painel. */
export function categoriasEmUso() {
  return ordenar([...new Set(state.produtos.map((p) => (p.categoria || '').trim()).filter(Boolean))]);
}

export const produtosDaCategoria = (nome) => state.produtos.filter((p) => p.categoria === nome);

/** Cadastra a categoria (ou devolve a existente com o mesmo nome). */
export async function adicionarCategoria(nome) {
  nome = nome.trim();
  const existente = categorias().find((c) => mesmoNome(c, nome));
  if (existente) return existente;
  state.cfg.categorias.push(nome);
  await salvarCfg();
  return nome;
}

/** Renomeia em todos os produtos. Se o novo nome já existir, as duas se juntam. */
export async function renomearCategoria(antiga, nova) {
  nova = nova.trim();
  const existente = categorias().find((c) => c !== antiga && mesmoNome(c, nova));
  const final = existente || nova;
  state.cfg.categorias = state.cfg.categorias.filter((c) => c !== antiga);
  if (!existente) state.cfg.categorias.push(final);
  await salvarCfg();
  for (const p of produtosDaCategoria(antiga)) {
    p.categoria = final;
    await salvarProduto(p);
  }
  return final;
}

/** Exclui a categoria; os produtos dela ficam sem categoria. */
export async function excluirCategoria(nome) {
  state.cfg.categorias = state.cfg.categorias.filter((c) => c !== nome);
  await salvarCfg();
  for (const p of produtosDaCategoria(nome)) {
    p.categoria = '';
    await salvarProduto(p);
  }
}

/* ---------- Produtos ---------- */
export function novoProduto(dados = {}) {
  return {
    id: uid(), nome: '', categoria: '', foto: null, notas: '',
    peso: 0, comprimento: 0, largura: 0, altura: 0, // gramas e centímetros, já embalado
    tempoMin: 60, horaPropria: null, perdaPct: 5,
    frete: { ecommerce: 0, ml: 0, shopee: 0 }, insumos: [],
    criadoEm: Date.now(), atualizadoEm: Date.now(),
    ...dados,
  };
}

export async function salvarProduto(p) {
  p.atualizadoEm = Date.now();
  const i = state.produtos.findIndex((x) => x.id === p.id);
  if (i >= 0) state.produtos[i] = p; else state.produtos.push(p);
  await db.put('produtos', structuredClone(p));
}

export async function excluirProduto(id) {
  state.produtos = state.produtos.filter((p) => p.id !== id);
  await db.del('produtos', id);
}

export async function duplicarProduto(p) {
  const c = structuredClone(p);
  Object.assign(c, { id: uid(), nome: `${p.nome} (cópia)`, criadoEm: Date.now() });
  await salvarProduto(c);
  return c;
}

/* ---------- Materiais (insumos) ---------- */
export const usosDoMaterial = (id) => state.produtos.filter((p) => p.insumos?.some((i) => i.materialId === id));

export async function salvarMaterial(m) {
  m.atualizadoEm = Date.now();
  const i = state.materiais.findIndex((x) => x.id === m.id);
  if (i >= 0) state.materiais[i] = m; else state.materiais.push(m);
  await db.put('materiais', structuredClone(m));
}

/** Exclui o insumo e o retira dos produtos que o usavam. */
export async function excluirMaterial(id) {
  state.materiais = state.materiais.filter((m) => m.id !== id);
  await db.del('materiais', id);
  for (const p of usosDoMaterial(id)) {
    p.insumos = p.insumos.filter((i) => i.materialId !== id);
    await salvarProduto(p);
  }
}

/* ---------- Configurações ---------- */
export async function salvarCfg() {
  await db.put('config', structuredClone(state.cfg));
}

export async function restaurarCanal(id) {
  const padrao = CANAIS_PADRAO.find((c) => c.id === id);
  const i = state.cfg.canais.findIndex((c) => c.id === id);
  if (padrao && i >= 0) state.cfg.canais[i] = { ...structuredClone(padrao), ativo: state.cfg.canais[i].ativo };
  await salvarCfg();
}

/* ---------- Exemplo / backup ---------- */
export async function carregarExemplo() {
  const { materiais, produtos } = exemplo(uid);
  for (const m of materiais) await salvarMaterial(m);
  for (const p of produtos) await salvarProduto(p);
}

export function exportar() {
  return {
    app: 'doce-engenho-custos',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    produtos: state.produtos,
    materiais: state.materiais,
    cfg: state.cfg,
  };
}

export async function importar(dados) {
  if (dados?.app !== 'doce-engenho-custos' || !Array.isArray(dados.produtos) || !Array.isArray(dados.materiais)) {
    throw new Error('Este arquivo não é um backup do Doce Engenho.');
  }
  await db.replace('produtos', dados.produtos);
  await db.replace('materiais', dados.materiais);
  await db.put('config', { ...mesclarCfg(dados.cfg), key: 'settings' });
  await carregar();
}

export async function marcarBackup() {
  state.cfg.ultimoBackup = Date.now();
  await salvarCfg();
}
