# nerdIA

Código y recursos de [nerdia.com.ar](https://nerdia.com.ar), la portada diaria de inteligencia artificial.

El sitio es un Cloudflare Worker (`dawn-cell-d2d8`) que lee la base D1 `nerdia-content`.

## Qué hay acá

- `src/worker.js` — el Worker: portada, `/ediciones`, `/ediciones/AAAA-MM-DD`, `/sobre`, RSS, sitemaps y la imagen para redes.
- `src/og.js` — dibuja la imagen para redes de cada edición (1200×630 PNG) con la plantilla del sistema de diseño nerdIA.
- `migrations/` — cambios a la base D1.
- `assets/og-nerdia.png` — la imagen genérica para redes (1200×630). La siguen usando el Worker como respaldo y páginas viejas; renombrarla o moverla rompe esas vistas previas.
- `assets/nerdia-mark.svg` — el logo de la taza.

## Imagen para redes por edición

Cada edición tiene su imagen en `https://nerdia.com.ar/og/AAAA-MM-DD.png`. La portada y las páginas de edición la usan como `og:image` y `twitter:image`.

- Se dibuja una sola vez por edición y queda guardada en la tabla `og_images` de D1.
- Si la edición tiene `stat_value` (y opcionalmente `stat_caption_es`), aparece la tarjeta con la cifra destacada; si no, sale solo el titular.
- Al cambiar la plantilla, subir `OG_VERSION` en `src/worker.js` para que se dibujen de nuevo y las redes pidan la imagen nueva.
- Si algo falla al dibujar, se redirige a `assets/og-nerdia.png`.

## Trabajar en local

```sh
npm install
npm run dev        # Worker local con una copia local de D1
```

## Publicar

```sh
npm run migrate    # aplica migrations/ a la base de producción (una vez por migración)
npm run deploy
```

O conectar el repo en Cloudflare (Workers & Pages › dawn-cell-d2d8 › Settings › Builds) para que cada push a `main` se publique solo.
