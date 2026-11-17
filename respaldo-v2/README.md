# NOIR Detailing · Olavarría (demo v2)

Web de demostración para mostrarles a locales de detailing de Olavarría. La marca, los precios y las opiniones son de ejemplo.

Una sola página con: hero que se "pule" con el mouse o el dedo, luz de inspección, comparador de agua con "Rociar agua", servicios, paquetes, antes/después + trabajos recientes, proceso, cotizador que termina en WhatsApp, opiniones, turnos con mapa y preguntas frecuentes.

## Cómo correrla

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ (lista para subir a Vercel, Netlify o un hosting común)
npm run preview  # sirve dist/ para revisarla
```

`dev` y `build` primero convierten las fotos de `fotos/` a WebP (`scripts/preparar-imagenes.mjs`).

## Adaptarla a otro local

Se cambian **solo dos cosas**: `src/config/negocio.json` y las fotos de `fotos/`.

| Campo de `negocio.json` | Qué controla |
|---|---|
| `nombre`, `nombreCorto`, `ciudad`, `lema` | Marca en el header, el footer, el título de la pestaña y los mensajes de WhatsApp ("Hola NOIR, …") |
| `avisoDemo` | La línea "Demo · …" de arriba y del footer. En la web real, dejala vacía o sacá el `<p class="aviso-demo">` |
| `whatsapp` | Número en formato internacional sin `+` ni espacios (ej.: `5492284611455`). Lo usan **todos** los botones de WhatsApp |
| `telefonoVisible` | Cómo se ve el teléfono en pantalla |
| `direccion`, `direccionCorta`, `mapa` (`lat`, `lng`, `zoom`) | Dirección, mapa, "Cómo llegar" y el dato del hero |
| `horario`, `horarioCorto` | Horario en contacto y footer |
| `instagram` (`usuario`, `url`) | Links a Instagram |
| `googleRating` | Opcional. Si está vacío no se muestra. Poné solo el promedio real de Google (ej.: `"4,9"`) |
| `mensajes` | Textos que arman los links de WhatsApp |
| `hero`, `pulido`, `ceramico` | Textos de esas secciones (`{direccionCorta}` y `{duracionAnios}` se reemplazan solos) |
| `servicios` | Tarjetas de servicios: qué incluye, tiempo, precio "desde", foto. También aparecen como servicio suelto en el cotizador y en el formulario de turnos |
| `paquetes` | Esencial / Completo / Premium: precio, lista y cuál es "El más elegido" |
| `cotizador` | Tamaños y su multiplicador, recargo por estado de pintura, extras con precio y días, redondeo y valores por defecto |
| `trabajos` | Grilla de trabajos recientes (auto, servicio, categoría para el filtro y foto) |
| `proceso` | Los 5 pasos de "Cómo trabajamos" |
| `opiniones`, `opinionesNota` | Opiniones. En la web real, reemplazalas por reseñas reales de Google |
| `preguntas` | Preguntas frecuentes |

Precios: van en pesos, como número entero (`180000`). El cotizador calcula
`precio principal × multiplicador del tamaño`, le suma el recargo del estado de pintura (solo si el servicio trabaja la pintura, `"pintura": true`) y los extras, y redondea al múltiplo de `redondeo`. Los días en el taller salen de `dias` del servicio/paquete + extras (+ `diasExtra` si la pintura está muy castigada).

Fotos: cada servicio, trabajo y paso tiene un campo `foto` con el nombre del archivo (sin extensión). Si `fotos/<nombre>.jpg` existe se muestra la foto; si no, un placeholder con `fotoPendiente`. La lista de las que faltan está en [FOTOS-PENDIENTES.md](FOTOS-PENDIENTES.md).

## Cómo está hecha

- **Vite**, sin framework. El HTML se arma en el build desde `negocio.json` (`build/pagina.mjs`), así todo el contenido está en el HTML y se ve aunque el JavaScript no cargue.
- `src/js/calculo.js`: cálculo del cotizador y armado de mensajes (lo usan el build y el navegador).
- `src/js/hero.js`: capa "sucia" en canvas que se limpia con el slider o pasando el mouse / dedo; medidor de brillo 0–100.
- `src/js/efectos.js`: luz de inspección, comparadores (con teclado), gotas de agua y línea del proceso.
- `src/js/cotizador.js` y `src/js/contacto.js`: cotizador, formulario de turno, mapa (Leaflet + OpenStreetMap, sin API key) y visor de trabajos.
- Con `prefers-reduced-motion`: el hero arranca pulido al 100 %, la luz queda fija, el agua muestra el estado final, la línea del proceso aparece completa y el total cambia sin conteo.

El diseño toma ideas de interacción genéricas; textos, layout y fotos son propios de esta demo.
