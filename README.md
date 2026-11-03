# Doce Engenho Ateliê — Custos e preços

App (PWA) para o tablet do ateliê: cadastro de produtos e insumos e cálculo do
**preço mínimo de anúncio** em cada canal (E-commerce, Mercado Livre e Shopee),
garantindo o valor da hora de trabalho.

Sem build e sem dependências: HTML, CSS e JavaScript puros. Os dados ficam no
próprio aparelho (IndexedDB) e o app funciona offline depois do primeiro acesso.

## Rodar no computador

```bash
python -m http.server 8765
```

Abra http://localhost:8765. Abrir o `index.html` direto (file://) não funciona,
porque os módulos JavaScript precisam de um servidor.

## Instalar no tablet

O app está publicado no GitHub Pages:

**https://mibzarinc.github.io/doce-engenho/**

1. No tablet, abra o endereço no **Chrome** (Android) ou no **Safari** (iPad).
2. Android: menu ⋮ → **Instalar app** (ou **Adicionar à tela inicial**).
   iPad: botão Compartilhar → **Adicionar à Tela de Início**.
3. Abra pelo ícone criado. Depois do primeiro acesso funciona sem internet.

## Publicar uma nova versão

1. Aumente `VERSAO` em `sw.js` (ex.: `'v3'`) para o tablet baixar os arquivos novos.
2. Envie para o GitHub:

```bash
git add -A
git commit -m "Descrição da mudança"
git push
```

Em 1 a 2 minutos o endereço é atualizado. No tablet aparece o aviso
**Nova versão disponível → Atualizar**. Os dados cadastrados não são afetados.

## Como o preço é calculado

```
precisa sobrar = materiais + perda% + (horas × valor da hora) [+ DAS rateado] [+ frete pago]
preço mínimo   = (precisa sobrar + taxa fixa) ÷ (1 − comissão%)
```

Cada canal tem **faixas de preço** (ex.: Shopee 20% + R$ 4,50 até R$ 79,99;
14% + R$ 16 de R$ 80 a R$ 99,99…). O cálculo testa todas as faixas e fica com
o menor preço que realmente entrega o valor necessário. Tudo isso aparece passo
a passo na sanfona "Ver o cálculo" de cada canal.

As taxas padrão são referências de nov/2026 e ficam em `js/defaults.js`. A
proprietária pode alterá-las na tela **Ajustes**.

## Estrutura

| Arquivo | Função |
|---|---|
| `js/calc.js` | Motor de cálculo (unidades, custos, preço mínimo por faixa, simulação) |
| `js/store.js` | Estado em memória + gravação, backup/restauração |
| `js/db.js` | IndexedDB |
| `js/defaults.js` | Taxas padrão dos canais e dados de exemplo |
| `js/views/*` | Telas: painel, produto, insumos, ajustes |
| `sw.js` | Modo offline |
