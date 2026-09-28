/* =========================================================
   VERALU — catálogo (compartilhado entre a home e as páginas de produto)
   Textos, variações e acréscimos de preço são de exemplo: trocar pelos reais.
   ========================================================= */
(() => {
  'use strict';

  const PRODUCTS = [
    { id: 'composition', name: 'Sketchbook Composition Book', artist: 'whatever', price: 64.9, img: 'assets/covers/composition.webp', tema: ['classicos'], accent: '#CFC6B2',
      desc: 'O clássico caderno de composição com alma de sketchbook. Para quem gosta de começar pelo básico — e rabiscar fora da linha.' },
    { id: 'estrelas', name: 'Sketchbook Estrelas', artist: 'larabonadiman', price: 64.9, img: 'assets/covers/estrelas.webp', tema: ['natureza', 'classicos'], accent: '#2B3F66', badge: 'mais amado',
      desc: 'Um céu inteiro na capa para lembrar que toda ideia começa pequena, feito estrela no fim da tarde.' },
    { id: 'bowie', name: 'Sketchbook BOWIE', artist: 'alanfendrich', price: 64.9, img: 'assets/covers/bowie.webp', tema: ['retratos', 'pop'], accent: '#E0493A',
      desc: 'Tributo ao camaleão do rock. Para páginas que mudam de pele toda semana.' },
    { id: 'onca', name: 'Sketchbook Onça Balacobaco', artist: 'saymonsmarcaro', price: 69.9, img: 'assets/covers/onca.webp', tema: ['natureza'], accent: '#F2A33A', badge: 'novo',
      desc: 'A onça mais festeira do Brasil guardando seus rabiscos com unhas e dentes.' },
    { id: 'fauna', name: 'Sketchbook Fauna Brasileira', artist: 'fernandamillani', price: 64.9, img: 'assets/covers/fauna.webp', tema: ['natureza'], accent: '#C98A73',
      desc: 'Bicho-preguiça, tamanduá e tucano num azulejo de afeto. Para desenhar devagar, no ritmo da mata.' },
    { id: 'cuba', name: 'Sketchbook Mulher em Cuba', artist: 'virnasantolia', price: 109.9, img: 'assets/covers/cuba.webp', tema: ['retratos'], accent: '#E9C46A', badge: 'edição limitada',
      desc: 'Cor, fumaça e calor de Havana. Um sketchbook que já chega contando história.' },
    { id: 'frida', name: 'Sketchbook Love is Art — Frida Kahlo e Van Gogh', artist: 'tobefonseca', price: 64.9, img: 'assets/covers/frida.webp', tema: ['retratos', 'pop'], accent: '#2E5552',
      desc: 'Frida e Vincent de mãos dadas — porque arte é, antes de tudo, um encontro.' },
    { id: 'coracao', name: 'Sketchbook Coração Groovy Vermelho', artist: 'dhefloriano', price: 69.9, img: 'assets/covers/coracao.webp', tema: ['pop'], accent: '#EF5D8C',
      desc: 'Created to create. Um coração groovy para quem desenha com o peito aberto.' },
    { id: 'africana', name: 'Sketchbook Mulheres — Africana', artist: 'marcelarodrigues', price: 64.9, img: 'assets/covers/africana.webp', tema: ['retratos'], accent: '#2A8FA3',
      desc: 'Turbante de muitas cores, força de muitas gerações. Para páginas cheias de raiz.' },
  ];
  PRODUCTS.forEach((p, i) => (p.rank = i));

  const SIZES = [
    { id: 'A5', label: 'A5', dims: '14,8 × 21 cm', extra: 0 },
    { id: 'A4', label: 'A4', dims: '21 × 29,7 cm', extra: 25 },
  ];
  const PAPERS = [
    { id: 'polen', label: 'Pólen 90g', tone: '#F6ECD2', extra: 0, about: 'Levemente amarelado e macio. Ótimo para grafite, caneta e esboços do dia a dia.' },
    { id: 'branco', label: 'Branco 150g', tone: '#FFFFFF', extra: 6, about: 'Branco e encorpado. Aguenta nanquim, marcador leve e colagem sem ondular.' },
    { id: 'mix', label: 'Mix media 200g', tone: '#FBF8F1', extra: 12, about: 'Gramatura alta e textura suave, para aquarela leve, guache e técnicas molhadas.' },
  ];

  const TEMAS = [['todos', 'Todos'], ['retratos', 'Retratos'], ['natureza', 'Natureza'], ['pop', 'Pop & música'], ['classicos', 'Clássicos'], ['favoritos', 'Favoritos']];
  const PRECOS = [['todos', 'Qualquer preço'], ['ate65', 'Até R$ 65'], ['65a80', 'R$ 65 a R$ 80'], ['80mais', 'Acima de R$ 80']];

  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  window.VERALU_DATA = {
    PRODUCTS, SIZES, PAPERS, TEMAS, PRECOS,
    byId: Object.fromEntries(PRODUCTS.map((p) => [p.id, p])),
    money: (v) => BRL.format(v),
    priceOf: (p, size = 'A5', paper = 'polen') =>
      p.price + (SIZES.find((s) => s.id === size) || SIZES[0]).extra + (PAPERS.find((s) => s.id === paper) || PAPERS[0]).extra,
    productUrl: (id) => `produto.html?id=${encodeURIComponent(id)}`,
  };
})();
