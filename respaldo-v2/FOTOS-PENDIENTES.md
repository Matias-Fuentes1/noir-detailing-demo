# Fotos pendientes

Mientras falte una foto, la web muestra un recuadro gris oscuro con la descripción de lo que va.

**Cómo cargarlas:** guardá cada foto en la carpeta `fotos/` con el **nombre exacto** de la tabla (en `.jpg`, `.png` o `.webp`). Al correr `npm run dev` o `npm run build` se convierte sola a WebP (1600 px y 800 px) y reemplaza el placeholder. No hace falta tocar el código.

Medida recomendada: el lado largo de **1600 px como mínimo**, en horizontal salvo que se indique otra cosa. Sin logos ni marcas de otros talleres.

## Servicios (tarjetas)

| Archivo | Medida | Qué tiene que mostrar |
|---|---|---|
| `servicio-lavado.jpg` | 1600 × 1000 | Auto cubierto de espuma activa en el prelavado |
| `servicio-opticas.jpg` | 1600 × 1000 | Faro delantero mitad opaco, mitad pulido |
| `servicio-motor.jpg` | 1600 × 1000 | Vano motor limpio, plásticos acondicionados |

## Trabajos recientes (grilla + visor)

| Archivo | Medida | Qué tiene que mostrar |
|---|---|---|
| `trabajo-amarok.jpg` | 1600 × 1200 | VW Amarok gris recién pulida, reflejo de luces en el capó |
| `trabajo-hilux.jpg` | 1600 × 1200 | Toyota Hilux negra, puerta con mitad pulida y mitad sin pulir |
| `trabajo-cronos.jpg` | 1600 × 1200 | Interior de Fiat Cronos, tapizado limpio |
| `trabajo-208.jpg` | 1600 × 1200 | Peugeot 208 con gotas de agua en perla sobre el techo |
| `trabajo-ranger.jpg` | 1600 × 1200 | Interior de camioneta Ranger, tapizado y alfombras limpios |
| `trabajo-cruze.jpg` | 1600 × 1200 | Chevrolet Cruze blanco, lateral pulido con reflejo nítido |

> En la web real, estas tienen que ser fotos de trabajos del local. Si cambian los autos, actualizá también `trabajos` en `src/config/negocio.json`.

## Cómo trabajamos (fotos chicas del proceso)

| Archivo | Medida | Qué tiene que mostrar |
|---|---|---|
| `proceso-revision.jpg` | 1200 × 900 | Detailer revisando la pintura con una linterna |
| `proceso-lavado.jpg` | 1200 × 900 | Auto con espuma y removedor de hierro actuando |
| `proceso-correccion.jpg` | 1200 × 900 | Pulidora trabajando sobre un panel oscuro |
| `proceso-proteccion.jpg` | 1200 × 900 | Aplicación de cerámico con aplicador sobre el capó |
| `proceso-entrega.jpg` | 1200 × 900 | Cliente recibiendo su auto terminado en el taller |

## Fotos que ya están (de la demo original)

| Archivo | Dónde se usa |
|---|---|
| `hero-coupe.jpg` | Hero (foto que se "pule") |
| `pintura-antes.jpg` | Luz de inspección, comparador de agua (mitad sin tratamiento) y antes/después |
| `pintura-despues.jpg` | Luz de inspección (etapa final), antes/después y tarjeta de Pulido |
| `agua-perlas.jpg` | Comparador de agua (mitad con cerámico) y tarjeta de Tratamiento cerámico |
| `interior-cuero.jpg` | Tarjeta de Detailing interior |

No se usó `reference-06.jpg` del proyecto original: muestra el logo y la marca de otro taller.
