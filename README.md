# Veralu — site piloto

Home (abertura → manifesto → essência → loja → rodapé) + uma página para cada sketchbook, feitas em HTML, CSS e JavaScript puros.
Não precisa de build: é só abrir o `index.html` no navegador (com internet, para carregar as fontes e as bibliotecas de animação).

## Como abrir

- **Mais simples:** dê dois cliques em `index.html`.
- **Com servidor local** (opcional, para testar no celular pela rede): qualquer servidor estático serve,
  por exemplo `npx serve .` nesta pasta.
- **Publicado:** o site é estático; no Vercel basta importar o repositório (sem build, sem configuração).
- Para pular a abertura enquanto edita: `index.html?nointro`. Para forçar a abertura: `index.html?abertura`.
- Página de um sketchbook: `produto.html?id=estrelas` (o `id` de cada um está em `js/data.js`).

## Estrutura

```
website/
├─ index.html          home (todas as seções)
├─ produto.html        página de cada sketchbook (preenchida pelo id da URL)
├─ css/style.css       identidade visual, layout, responsivo e "modo leve"
├─ js/data.js          catálogo: produtos, tamanhos, papéis e preços
├─ js/core.js          comum às páginas: rolagem, cursor, sacola, favoritos, transição de tinta, rodapé
├─ js/art-data.js      frase do hero e espirais (desenhos do protótipo do Canva)
├─ js/home.js          hero, seção do grito, vitrine com filtros
├─ js/intro.js         abertura (nome com física + tinta)
├─ js/product.js       página do sketchbook (galeria, opções, compra, sugestões)
└─ assets/             (imagens em WebP)
   ├─ caos/            os 5 desenhos da palavra CAOS
   ├─ covers/          capas dos sketchbooks (recortadas do protótipo — trocar pelas fotos reais)
   └─ img/             ilustração do grito
```

## Abertura e transição de tinta

- O nome "Veralu" cai letra por letra com uma simulação física (gravidade, quique, achatamento no impacto e balanço até assentar).
- Depois, a mesma transição da LXL Studios: um traço único que se desenha, engrossa até cobrir a tela e se apaga revelando o hero.
- A mesma tinta faz a passagem entre páginas (home ↔ sketchbooks). A cor é o azul-marinho da marca: para trocar, mude
  `color` em `.ink` no `style.css` (ex.: `var(--navy-2)`). O traço mantém a proporção em qualquer tela (não estica).
- Voltar pelo navegador devolve ao mesmo ponto da home, sem repetir a abertura.

## Espirais do hero

Só as 5 espirais que estão inteiras no Canva (`spirals` 0, 6, 7, 8 e 9 em `js/art-data.js`; as outras eram
pedaços recortados). Cada lado da frase tem uma coluna em zigue-zague, com espaço entre elas, e cada espiral gira
devagar em volta do próprio centro, sem sair do lugar. Rolar a página ou clicar no CAOS acelera o giro.
A posição, o tamanho e a velocidade de cada uma ficam na lista `PLACE` em `js/home.js`.
Quando as novas espirais estiverem prontas, é só exportar em SVG e substituir.

## O que trocar antes de publicar

- **Produtos:** a lista fica em `js/data.js` (`PRODUCTS`). Cada item tem nome, artista, preço, imagem, temas,
  cor de destaque e descrição. Tamanhos (`SIZES`) e papéis (`PAPERS`), com os acréscimos de preço, também ficam lá.
  Descrições, variações e os textos dos acordeões em `produto.html` são de exemplo.
- **Capas:** as imagens em `assets/covers/` foram recortadas do protótipo em baixa resolução.
  Use fotos reais das capas (proporção ~ 0,72, ex.: 720×1000 px, de preferência em WebP) e ajuste o caminho em `PRODUCTS`.
  Quando houver fotos reais do miolo e da lateral, elas podem substituir as vistas desenhadas em CSS na galeria.
- **Pagamento:** "Comprar" coloca o item na sacola e já abre a sacola; "Finalizar pedido" ainda só mostra um aviso.
  A sacola e os favoritos ficam salvos no navegador de quem visita (localStorage), prontos para ligar num checkout
  (Pix/cartão) ou pedido por WhatsApp na fase 2.
- **Newsletter:** o formulário do rodapé só valida o e-mail e agradece; não envia para nenhum serviço ainda.

## Bibliotecas (via CDN)

- [GSAP 3.12](https://gsap.com) + ScrollTrigger + Flip — animações, gatilhos de scroll e reorganização da grade
- [Lenis](https://lenis.darkroom.engineering) — rolagem suave
- Poppins (Google Fonts)

## Desempenho

- O que se mexe o tempo todo (espirais, onda, estampa de onça, letras da abertura) é movido pela placa de vídeo, sem redesenhar a tela.
- A onda da essência desliza só com CSS; nada é recalculado a cada quadro.
- Cursor do sistema, sem atraso; só uma etiqueta aparece em alguns elementos.
- Animações contínuas pausam quando saem da tela. Sem desfoque de fundo (backdrop-filter) em nenhum lugar.
- **Modo leve automático:** nos primeiros segundos o site mede se o computador segura 60 quadros por segundo.
  Se não segurar, desliga a rolagem suave e pausa os efeitos contínuos mais caros (grão animado, estampa à deriva),
  mantendo o visual.

## Acessibilidade

- Quem usa "reduzir movimento" no sistema recebe o site sem a abertura e com animações mínimas.
- Na abertura: rolar a página acelera a animação, `Esc` ou o botão "pular abertura" pulam direto.
- O grito também funciona pelo teclado (segure Espaço ou Enter com o personagem em foco).
