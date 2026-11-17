# NOIR Detailing · Olavarría (demo v4)

Web de demostración para mostrarles a locales de detailing de Olavarría. La marca, los precios y las opiniones son de ejemplo.
Acción principal: **pedir una cotización por WhatsApp**. Acción secundaria: el cotizador y las demos.

Una sola página, todo oscuro, en 10 bloques: hero que se "pule" con el mouse o el dedo (con contador de brillo y "Pulir todo") · manifiesto · 01 Pulido (luz de inspección por etapas) · 02 Cerámico (agua sobre el panel) · 03 Servicios (bento) · 04 Resultados (antes/después + trabajos recientes) · 05 Proceso (tira LED) · 06 Presupuesto (cotizador → WhatsApp) · 07 Opiniones · 08 Contacto (datos + WhatsApp) + preguntas + mapa · footer con el wordmark.

## Cómo correrla

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ (lista para Vercel, Netlify o un hosting común)
npm run preview  # sirve dist/ para revisarla
```

`dev` y `build` primero convierten las fotos de `fotos/` (con subcarpetas) a WebP de 1600 y 800 px en `public/img/` (`scripts/preparar-imagenes.mjs`).

## Adaptarla a otro local

Se cambian **tres cosas**: `src/config/negocio.json`, las fotos de `fotos/` y, si querés, el color de acción.

- **Color de acción:** `--accent` al principio de `src/estilos.css` (el verde lima de NOIR). Es el único color de acción de toda la web.
- **WhatsApp:** `"whatsapp"` en formato internacional sin `+` ni espacios (ej.: `5492284000000`). Mientras tenga `X` (`549XXXXXXXXXX`), los links abren `https://wa.me/?text=…`: el mensaje se arma igual y se elige el contacto a mano. El número visible muestra "(ejemplo)".
- **Fotos:** cada foto se nombra en `negocio.json` por su ruta sin extensión (`"servicios/opticas"` → `fotos/servicios/opticas.jpg`). Si falta una, el build avisa en la consola y deja un panel liso.

| Campo de `negocio.json` | Qué controla |
|---|---|
| `nombre`, `nombreCorto`, `ciudad`, `region`, `lema` | Marca, título de la pestaña, footer y los mensajes ("Hola NOIR, …") |
| `avisoDemo` | La línea "Demo · …" del footer. En la web real, dejala vacía |
| `whatsapp`, `telefonoVisible` | Todos los botones de WhatsApp y el número en pantalla |
| `direccion`, `direccionCorta`, `mapa`, `horario`, `horarioCorto`, `instagram` | Contacto, mapa y footer |
| `mensajes` | Textos que arman los links de WhatsApp |
| `hero` | Título en 2 líneas (la 2.ª va en outline; debajo de 600 px, en gris sólido), bajada, foto y la pista del contador |
| `manifiesto` | Frase, foto y los 4 datos (de la oferta, no resultados inventados) |
| `pulido` | Título y las 4 etapas (botón, título, texto y % de defectos de la simulación) |
| `ceramico` | Título, datos de cada modo (ángulo, comportamiento) y las 3 tarjetas de duración → paquete del cotizador |
| `servicios` | Tarjetas del bento (la primera es la grande): línea, tiempo, precio "desde", foto. También son "servicio suelto" en el cotizador |
| `paquetes` | Esencial / Completo / Premium. Viven **solo** en el cotizador |
| `cotizador` | Tamaños y multiplicador, recargo por estado de pintura, extras, redondeo y valores por defecto |
| `resultados` | Pares del comparador (Pintura · Interior · Llantas). Sin foto `antes`, el "antes" se simula a partir de la foto terminada |
| `trabajos`, `proceso`, `opiniones`, `opinionesNota`, `contacto`, `preguntas` | El resto de los bloques |

Precios en pesos, número entero. El cotizador calcula `precio × multiplicador del tamaño`, suma el recargo del estado (solo si `"pintura": true`) y los extras, y redondea al múltiplo de `redondeo`.

## Sistema visual

- Fondos `#09090b`, paneles `#131316` / `#1a1a1e`, líneas `rgba(255,255,255,.09)`, texto `#eeeef0` / 68 % / 44 % (el 44 % solo en texto grande).
- Títulos en **Anybody** (ancha, fina, en mayúsculas) con la 2.ª línea en outline; texto en **Instrument Sans**; **DM Mono** solo para lecturas y datos. Las tres son self-hosted (`@fontsource`) con `font-display: swap`.
- Paneles de 18 px de radio, borde de 1 px, sin sombras. Botón primario: píldora en `--accent` con flecha.
- Movimiento: curva `cubic-bezier(.16,1,.3,1)`. Los títulos entran línea por línea (600 ms, 80 ms entre líneas) una sola vez. Las únicas demos que se mueven son el hero, la luz, el agua y el proceso, más un parallax muy leve en las fotos de Servicios (solo desktop). En mobile, duraciones, paquetes, trabajos y opiniones van en carrusel horizontal con snap.
- Con `prefers-reduced-motion`: títulos quietos, hero limpio desde el inicio ("Brillo 100 / 100"), sin parallax, agua en estado final, tira LED completa y sin scroll suave.

## Cómo está hecha

- **Vite**, sin framework. El HTML se arma en el build desde `negocio.json` (`build/pagina.mjs`): todo el contenido queda en el HTML y se ve aunque el JavaScript no cargue.
- `src/js/calculo.js`: cálculo del cotizador, mensajes y link de WhatsApp (lo usan el build y el navegador).
- `src/js/hero.js`: capa de mugre en canvas que se limpia pasando el mouse o el dedo (pincel blando de ~120 / 90 px). Muestrea el % limpio cada 150 ms; al 95 % funde el resto, muestra "IMPECABLE." y el botón principal late una vez. "Pulir todo" hace lo mismo con teclado.
- `src/js/efectos.js`: luz de inspección por etapas, comparador con selector, agua, parallax leve del bento (solo desktop) y tira LED.
- `src/js/cotizador.js` y `src/js/contacto.js`: cotizador y mapa (Leaflet + OpenStreetMap, oscuro, sin rueda).
- `capturas/`: capturas de la página completa a 1440 y 390 px.
- `respaldo-v2/`: el código de la v2, por si hace falta comparar.

La estructura toma como referencia un preset de estudio de detailing; textos, marca, fotos y código son propios de esta demo.
