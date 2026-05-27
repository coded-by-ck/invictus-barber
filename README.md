# INVICTUS BARBER

Base front-end premium para a barbearia INVICTUS BARBER.

## Estrutura

```text
index.html
assets/
  css/
    ck-loader.css
    style.css
  js/
    app.js
    booking.js
    ck-loader.js
    storage.js
  img/
    ...
README.md
```

CSS ativo:

- `assets/css/style.css`
- `assets/css/ck-loader.css`

JS ativo:

- `assets/js/app.js`
- `assets/js/booking.js`
- `assets/js/ck-loader.js`
- `assets/js/storage.js`

## Como abrir

Abra o arquivo `index.html` diretamente no navegador.

## Recursos implementados

- Navbar fixa com glassmorphism
- Menu responsivo
- Hero cinematografico
- Logo textual Invictus Barber
- CTAs "Agendar agora" e "Ver servicos"
- Card lateral de agendamento rapido
- Hero com imagem cinematografica gerada para o projeto
- Particulas douradas flutuando em canvas
- Loader premium com logo
- Scroll reveal
- Parallax suave no hero
- Responsividade para mobile, tablet e desktop

## Como reutilizar o loader Coded by CK em outros projetos

Copie estes arquivos para o outro projeto:

- `assets/css/ck-loader.css`
- `assets/js/ck-loader.js`
- `assets/img/codedby.ck-img.png`

Importe no HTML:

```html
<link rel="stylesheet" href="assets/css/ck-loader.css" />
<script src="assets/js/ck-loader.js" defer></script>
```

Use a assinatura com `data-ck-signature`:

```html
<a href="https://instagram.com/codedby.ck" data-ck-signature>Coded by CK</a>
```

O loader inicia sozinho no clique, mostra a transicao “Coded by CK” e depois abre o link da assinatura.
