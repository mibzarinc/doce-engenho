// Valores iniciais. As taxas são referências de nov/2026 e podem (e devem)
// ser conferidas e ajustadas na tela Ajustes sempre que as plataformas mudarem.

export const CANAIS_PADRAO = [
  {
    id: 'ecommerce',
    nome: 'E-commerce',
    descricao: 'Sua loja própria (WordPress/WooCommerce). A taxa é a do meio de pagamento — ex.: Mercado Pago ou PagBank cobram cerca de 5% no cartão.',
    ativo: true,
    faixas: [
      { min: 0, pct: 4.99, fixa: 0, frete: true },
    ],
  },
  {
    id: 'ml',
    nome: 'Mercado Livre',
    descricao: 'Anúncio Clássico: comissão de 10% a 14% conforme a categoria (Premium: 15% a 19%). Abaixo de R$ 79 há um custo fixo por unidade; a partir de R$ 79 o frete é grátis para o comprador e você paga parte dele.',
    ativo: true,
    faixas: [
      { min: 0, pct: 12, fixa: 6.25, frete: false },
      { min: 29, pct: 12, fixa: 6.5, frete: false },
      { min: 50, pct: 12, fixa: 6.75, frete: false },
      { min: 79, pct: 12, fixa: 0, frete: true },
    ],
  },
  {
    id: 'shopee',
    nome: 'Shopee',
    descricao: 'Vendedor CNPJ (MEI). Comissão por faixa de preço, já incluindo o programa de frete grátis. Taxa fixa até R$ 79,99 atualizada para R$ 4,50 em out/2026.',
    ativo: true,
    faixas: [
      { min: 0, pct: 20, fixa: 4.5, frete: false },
      { min: 80, pct: 14, fixa: 16, frete: false },
      { min: 100, pct: 14, fixa: 20, frete: false },
      { min: 200, pct: 14, fixa: 26, frete: false },
      { min: 500, pct: 14, fixa: 26, frete: false },
    ],
  },
];

/** Nomes curtos para espaços pequenos (cards e barra de preços). */
export const NOMES_CURTOS = { ecommerce: 'Loja', ml: 'M. Livre', shopee: 'Shopee' };

export const CONFIG_PADRAO = {
  key: 'settings',
  horaPadrao: 25,
  arredondar: true,
  das: { ativo: false, valor: 82.05, vendasMes: 20 },
  canais: CANAIS_PADRAO,
  categorias: ['Bonecas', 'Ursinhos', 'Personagens', 'Naninhas', 'Acessórios', 'Decoração'],
  ultimoBackup: null,
};

/** Dados de exemplo para ela ver como funciona antes de cadastrar os seus. */
export function exemplo(uid) {
  const m = (nome, qtd, unidade, preco, fornecedor = '') => ({ id: uid(), nome, qtd, unidade, preco, fornecedor, criadoEm: Date.now() });
  const tecido = m('Tecido tricoline estampado', 1, 'm', 32, 'Armarinho do centro');
  const pelucia = m('Pelúcia soft', 1, 'm', 58);
  const fibra = m('Fibra siliconada', 1, 'kg', 38);
  const linha = m('Linha de costura', 1000, 'm', 9.9);
  const olhos = m('Olhos de segurança', 10, 'par', 14);
  const feltro = m('Feltro (folha 40×60)', 10, 'folha', 22);
  const fita = m('Fita de cetim', 10, 'm', 8.5);
  const cabelo = m('Lã para cabelo', 1, 'novelo', 12.9);
  const emb = m('Embalagem (saquinho + tag)', 50, 'un', 45);
  const materiais = [tecido, pelucia, fibra, linha, olhos, feltro, fita, cabelo, emb];
  const i = (mat, qtd, unidade) => ({ materialId: mat.id, qtd, unidade: unidade || mat.unidade });
  const base = { foto: null, notas: '', horaPropria: null, perdaPct: 5, frete: { ecommerce: 0, ml: 0, shopee: 0 }, criadoEm: Date.now(), atualizadoEm: Date.now() };
  const produtos = [
    {
      ...base, id: uid(), nome: 'Ursinho Mel (exemplo)', categoria: 'Ursinhos', tempoMin: 150,
      insumos: [i(pelucia, 45, 'cm'), i(fibra, 180, 'g'), i(linha, 40), i(olhos, 1), i(feltro, 1), i(fita, 60, 'cm'), i(emb, 1)],
    },
    {
      ...base, id: uid(), nome: 'Boneca Aninha (exemplo)', categoria: 'Bonecas', tempoMin: 240,
      insumos: [i(tecido, 50, 'cm'), i(fibra, 150, 'g'), i(linha, 60), i(cabelo, 1), i(feltro, 2), i(emb, 1)],
    },
  ];
  return { materiais, produtos };
}
