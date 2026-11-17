# Fotos

No queda ninguna foto pendiente: las 15 del paquete `noir-fotos.zip` (Unsplash, licencia libre de Unsplash) están en uso.

| Carpeta | Dónde aparecen |
|---|---|
| `fotos/servicios/` (6) | Tarjetas del bento de 03 · Servicios (la primera, `tratamiento-ceramico`, es la grande) |
| `fotos/proceso/` (5) | Los 5 pasos de 05 · Proceso |
| `fotos/trabajos/` (3) | "Trabajos recientes" en 04 · Resultados |
| `fotos/nosotros/` (1) | Foto vertical del manifiesto |
| `fotos/` (5, de la v2) | Hero, luz de inspección, agua y el par "Pintura" del antes/después |

**Para cambiar una foto:** reemplazá el archivo en `fotos/` con el mismo nombre (jpg, png o webp, lado largo de 1600 px como mínimo) y corré `npm run dev` o `npm run build`: se convierte sola a WebP de 1600 y 800 px en `public/img/`. Si cambiás el nombre, actualizá el campo `foto` en `src/config/negocio.json` y su `fotoAlt` (en castellano, describiendo lo que se ve).
