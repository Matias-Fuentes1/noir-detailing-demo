// Arma todo el HTML de la página desde el contenido (Supabase o, si no hay, src/config/negocio.json).
// Corre en el build de Vite (versión estática de respaldo) y en el servidor (api/pagina.js) en cada visita,
// así el contenido queda en el HTML y se ve aunque el JavaScript no cargue.
// Orden de bloques: hero · manifiesto · 01 pulido · 02 cerámico · 03 servicios · 04 resultados ·
// 05 proceso · 06 presupuesto · 07 opiniones · 08 contacto + preguntas · footer.
import { calcular, pesos, linkWhatsApp, opcionesPrincipales, completar, esNumeroEjemplo, tamanosActivos, extrasActivos } from '../src/js/calculo.js';
import { normalizar, promoVigente, datosCliente } from '../src/js/contenido.js';
import { icono } from './iconos.mjs';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const dos = (i) => String(i).padStart(2, '0');
const flecha = '<span class="flecha" aria-hidden="true">→</span>';

// Siluetas en línea para el cotizador (viewBox 0 0 124 48).
const SILUETAS = {
  chico: '<path d="M10 38v-8q2-5 10-6l16-2 12-10q4-3 10-3h20q6 0 10 6l8 10q8 1 10 5v8"/><path d="M41 38h41"/><circle cx="32" cy="38" r="7"/><circle cx="90" cy="38" r="7"/>',
  mediano: '<path d="M4 38v-8q2-5 12-6l18-2 12-10q4-3 10-3h20q6 0 10 5l8 8 16 2q6 2 6 6v8"/><path d="M36 38h52"/><circle cx="28" cy="38" r="7"/><circle cx="96" cy="38" r="7"/>',
  suv: '<path d="M6 38V24q1-5 8-6l16-1 10-11q2-2 8-2h46q6 0 8 5l6 10q6 1 6 6v13"/><path d="M38 38h48"/><circle cx="29" cy="38" r="8"/><circle cx="95" cy="38" r="8"/>',
  grande: '<path d="M4 38V14q0-8 8-8h74q6 0 10 6l10 10q8 1 8 6v10"/><path d="M33 38h53"/><circle cx="25" cy="38" r="8"/><circle cx="94" cy="38" r="8"/>',
};
const silueta = (id, clase = '') =>
  `<svg class="silueta ${clase}" viewBox="0 0 124 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SILUETAS[id] ?? SILUETAS.mediano}</svg>`;

// Marcadores que delimitan lo que se re-renderiza en el servidor sobre la plantilla del build.
export const MARCAS = { headIni: '<!--@head:ini-->', headFin: '<!--@head:fin-->', cuerpoIni: '<!--@cuerpo:ini-->', cuerpoFin: '<!--@cuerpo:fin-->' };

// JSON seguro para incrustar en <script type="application/json">.
const jsonSeguro = (v) => JSON.stringify(v).replace(/</g, '\u003c').replace(/>/g, '\u003e').replace(/&/g, '\u0026');

export function renderPagina(html, negocio, imagenes = {}, opciones = {}) {
  const n = normalizar(negocio);
  const sec = n.secciones;
  const ver = (k) => sec[k]?.visible !== false;
  const hoy = opciones.hoy ?? new Date();
  const wa = (texto) => esc(linkWhatsApp(n, texto));
  const waCotizacion = wa(completar(n.mensajes.cotizacion, n));
  const ejemplo = esNumeroEjemplo(n);
  const telefono = (clase = '') =>
    `<span class="${clase}">${esc(n.telefonoVisible)}${ejemplo ? ' <small class="ejemplo">(ejemplo)</small>' : ''}</span>`;
  const ext = 'target="_blank" rel="noopener"';

  // Foto con srcset (800 y 1600 px). Si falta, avisa en la consola del build y deja un panel liso.
  const foto = (nombre, alt, { sizes = '100vw', eager = false, clase = '', decorativa = false } = {}) => {
    const carga = eager ? 'fetchpriority="high"' : 'loading="lazy"';
    if (nombre && typeof nombre === 'object') {
      // Foto subida desde el panel (Supabase Storage), con versión de 800 px.
      const chico = Math.min(800, nombre.w);
      return `<img class="${clase}" src="${esc(nombre.src)}" srcset="${esc(nombre.src800)} ${chico}w, ${esc(nombre.src)} ${nombre.w}w" sizes="${sizes}" width="${nombre.w}" height="${nombre.h}" alt="${decorativa ? '' : esc(alt)}" ${carga} decoding="async">`;
    }
    const datos = nombre ? imagenes[nombre] : null;
    if (!datos) {
      if (nombre && !opciones.silencioso) console.warn(`[pagina] Falta la foto "${nombre}" en fotos/. Se muestra un panel liso.`);
      return `<div class="ph ${clase}"${decorativa ? ' aria-hidden="true"' : ` role="img" aria-label="${esc(alt)}"`}></div>`;
    }
    const chico = Math.min(800, datos.w);
    return `<img class="${clase}" src="/img/${nombre}.webp" srcset="/img/${nombre}-800.webp ${chico}w, /img/${nombre}.webp ${datos.w}w" sizes="${sizes}" width="${datos.w}" height="${datos.h}" alt="${decorativa ? '' : esc(alt)}" ${carga} decoding="async">`;
  };
  const urlFoto = (f) => (!f ? '' : typeof f === 'object' ? f.src : imagenes[f] ? `/img/${f}.webp` : '');

  // Título de dos líneas: la primera sólida, la segunda en outline. Cada línea entra con máscara.
  const titulo = ([l1, l2], { tag = 'h2', id = '', clase = '' } = {}) =>
    `<${tag} class="titulo ${clase}"${id ? ` id="${id}"` : ''}><span class="linea"><span>${esc(l1)}</span></span>${l2 ? ` <span class="linea linea-2"><span>${esc(l2)}</span></span>` : ''}</${tag}>`;

  // Etiqueta "— 01 · PULIDO" sobre cada h2. La numeración salta las secciones ocultas.
  const numeradas = ['pulido', 'ceramico', 'servicios', 'promociones', 'resultados', 'proceso', 'cotizador', 'opiniones', 'contacto'];
  const promos = n.promociones.filter((x) => promoVigente(x, hoy));
  const hayContenido = { promociones: promos.length > 0 };
  const numeros = {};
  numeradas.filter((k) => ver(k) && hayContenido[k] !== false).forEach((k, i) => { numeros[k] = i + 1; });
  const etiqueta = (num, texto) => `<p class="etiqueta"><span>${dos(typeof num === 'string' ? numeros[num] : num)}</span> · ${esc(texto)}</p>`;

  const cabecera = ({ num, nombre, t, id, texto, clase = '' }) => `
      <div class="cabecera ${clase}">
        <div>${etiqueta(num, nombre)}${titulo(t, { id })}</div>
        ${texto ? `<p class="lead">${esc(texto)}</p>` : ''}
      </div>`;

  const marca = `<a class="brand" href="#inicio" aria-label="${esc(n.nombre)}, ir al inicio"><span class="brand-name">${esc(n.nombreCorto)}</span><span class="brand-sub">Detailing · ${esc(n.ciudad)}</span></a>`;

  const links = [
    ['pulido', 'Pulido'],
    ['ceramico', 'Cerámico'],
    ['servicios', 'Servicios'],
    ['resultados', 'Resultados'],
    ['cotizador', 'Presupuesto'],
  ]
    .filter(([k]) => ver(k))
    .map(([k, t]) => [`#${k}`, t]);

  // ---------- Header ----------
  const header = `
  <header class="header" id="header">
    <div class="header-in">
      ${marca}
      <nav class="nav" id="menu" aria-label="Principal">
        ${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
        <a class="btn btn-acento nav-cta" href="${waCotizacion}" ${ext}>Pedir cotización ${flecha}</a>
      </nav>
      <div class="header-acciones">
        <a class="header-tel" href="${waCotizacion}" ${ext} aria-label="WhatsApp ${esc(n.telefonoVisible)}${ejemplo ? ' (número de ejemplo)' : ''}">${telefono('dato')}</a>
        <a class="btn btn-acento btn-chico header-cta" href="${waCotizacion}" ${ext}>Pedir cotización</a>
        <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">${icono('menu')}</button>
      </div>
    </div>
  </header>`;

  // ---------- Hero ----------
  const h = n.hero;
  const hero = `
  <section class="hero" id="inicio" aria-labelledby="hero-titulo">
    <div class="hero-media" id="hero-media">
      ${foto(h.foto, h.fotoAlt, { eager: true, clase: 'hero-foto' })}
      <canvas class="hero-sucio solo-js" id="hero-sucio" aria-hidden="true"></canvas>
    </div>
    <p class="hero-ciudad dato">${esc(n.ciudad)} · ${esc(n.region)}</p>
    <div class="wrap hero-contenido">
      ${titulo(h.titulo, { tag: 'h1', id: 'hero-titulo', clase: 'titulo-hero' })}
      <p class="hero-bajada">${esc(h.bajada)}</p>
      <div class="hero-acciones">
        <div class="botones">
          ${h.botones
            .filter((b) => b.texto)
            .map((b, i) => {
              const destino = b.enlace === 'whatsapp' ? linkWhatsApp(n, completar(n.mensajes.cotizacion, n)) : b.enlace || '#cotizador';
              const externo = /^https?:/i.test(destino);
              return `<a class="btn ${i === 0 ? 'btn-acento' : 'btn-borde'}" href="${esc(destino)}"${externo ? ` ${ext}` : ''}>${esc(b.texto)}${i === 0 ? ` ${flecha}` : ''}</a>`;
            })
            .join('')}
        </div>
        <div class="hero-pulido solo-js">
          <div class="pulido-medidor">
            <p class="pulido-texto" id="pulido-texto" aria-hidden="true">${esc(h.pista)}</p>
            <span class="brillo-barra" aria-hidden="true"><i id="brillo-fill"></i></span>
          </div>
          <button type="button" class="btn btn-borde btn-chico" id="pulir-todo">Pulir todo</button>
          <p class="visually-hidden" id="pulido-aviso" aria-live="polite"></p>
        </div>
      </div>
    </div>
  </section>`;

  // ---------- Manifiesto ----------
  const m = n.manifiesto;
  const manifiesto = !ver('manifiesto') ? '' : `
  <section class="section manifiesto" id="nosotros" aria-labelledby="manifiesto-titulo">
    <div class="wrap">
      <div class="manif-grid">
        ${titulo(m.frase, { id: 'manifiesto-titulo', clase: 'manif-titulo' })}
        <figure class="manif-foto">${foto(m.foto, m.fotoAlt, { sizes: '(min-width: 900px) 34vw, 92vw' })}</figure>
      </div>
      <dl class="manif-datos">
        ${m.datos.map((d) => `<div><dt>${esc(d.texto)}</dt><dd>${esc(d.valor)}</dd></div>`).join('')}
      </dl>
    </div>
  </section>`;

  // ---------- 01 · Pulido ----------
  const p = n.pulido;
  const e0 = p.etapas[0];
  const pulido = !ver('pulido') || !p.etapas.length ? '' : `
  <section class="section" id="pulido" aria-labelledby="pulido-titulo">
    <div class="wrap pulido-grid">
      <div class="pulido-copy">
        ${etiqueta('pulido', 'Pulido')}
        ${titulo(p.titulo, { id: 'pulido-titulo' })}
        <p class="lead">${esc(p.texto)}</p>
        <div class="selector" role="group" aria-label="Etapas del pulido">
          ${p.etapas.map((e, i) => `<button type="button" class="selector-op" data-etapa="${i}" aria-pressed="${i === 0}">${esc(e.nombre)}</button>`).join('')}
        </div>
        <div class="etapa-info" aria-live="polite">
          <h3 class="etapa-titulo" id="etapa-titulo">${esc(e0.titulo)}</h3>
          <p id="etapa-texto">${esc(e0.texto)}</p>
          <p class="dato lectura">Defectos <b id="etapa-defectos">${e0.defectos} %</b> <span>· simulación</span></p>
        </div>
      </div>
      <figure class="inspeccion panel" id="inspeccion" data-etapa="0">
        ${foto('pintura-antes', 'Pintura oscura con micro rayas bajo una luz directa', { sizes: '(min-width: 900px) 55vw, 100vw', clase: 'insp-antes' })}
        ${foto('pintura-despues', '', { sizes: '(min-width: 900px) 55vw, 100vw', clase: 'insp-despues', decorativa: true })}
        <div class="insp-rayas" aria-hidden="true"></div>
        <div class="insp-luz" aria-hidden="true"></div>
        <figcaption class="panel-hud"><span class="dato">Luz de inspección</span><span class="dato">Etapa <b id="insp-etapa">1</b> / ${p.etapas.length}</span></figcaption>
        <p class="panel-pista solo-js" aria-hidden="true">Mové la luz</p>
      </figure>
    </div>
  </section>`;

  // ---------- 02 · Cerámico ----------
  const c = n.ceramico;
  const ceramico = !ver('ceramico') ? '' : `
  <section class="section" id="ceramico" aria-labelledby="ceramico-titulo">
    <div class="wrap">
      <div class="ceramico-grid">
        <figure class="agua panel" id="agua" data-modo="con">
          <div class="agua-capa" data-capa="sin">${foto('pintura-antes', 'Panel oscuro sin tratamiento: el agua queda extendida', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div>
          <div class="agua-capa" data-capa="con">${foto('agua-perlas', 'Panel con cerámico: el agua forma gotas en perla', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div>
          <div class="gotas" id="gotas" aria-hidden="true"></div>
          <figcaption class="panel-hud"><span class="dato" id="agua-rotulo">Con cerámico</span><span class="dato">Simulación</span></figcaption>
        </figure>
        <div class="ceramico-copy">
          ${etiqueta('ceramico', 'Cerámico')}
          ${titulo(c.titulo, { id: 'ceramico-titulo' })}
          <p class="lead">${esc(c.texto)}</p>
          <div class="agua-controles solo-js">
            <div class="selector" role="group" aria-label="Comparar el panel">
              <button type="button" class="selector-op" data-modo="con" aria-pressed="true">Con cerámico</button>
              <button type="button" class="selector-op" data-modo="sin" aria-pressed="false">Sin cerámico</button>
            </div>
            <button type="button" class="btn btn-borde" id="rociar">${icono('gota')} Rociar el panel</button>
          </div>
          <dl class="agua-datos">
            <div><dt>Ángulo de contacto</dt><dd class="dato" id="agua-angulo">${esc(c.modos.con.angulo)}</dd></div>
            <div><dt>Comportamiento</dt><dd class="dato" id="agua-comp">${esc(c.modos.con.comportamiento)}</dd></div>
            <div class="solo-js"><dt>Gotas</dt><dd class="dato" id="agua-gotas">0</dd></div>
          </dl>
        </div>
      </div>
      <ul class="duraciones" aria-label="Duración del cerámico según el paquete">
        ${c.duraciones
          .map((d) => {
            const pk = n.paquetes.find((x) => x.id === d.paquete && x.activo);
            if (!pk || !ver('cotizador')) return `<li><div class="duracion panel${d.destacado ? ' duracion-destacada' : ''}"><span class="duracion-anios">${esc(d.anios)}</span><span class="duracion-texto">${esc(d.texto)}</span></div></li>`;
            return `<li><a class="duracion panel${d.destacado ? ' duracion-destacada' : ''}" href="#cotizador" data-preset="${esc(d.paquete)}"><span class="duracion-anios">${esc(d.anios)}</span><span class="duracion-paquete">${esc(pk?.nombre ?? '')}</span><span class="duracion-texto">${esc(d.texto)}</span><span class="duracion-link">Calcular mi presupuesto ${flecha}</span></a></li>`;
          })
          .join('')}
      </ul>
    </div>
  </section>`;

  // ---------- 03 · Servicios ----------
  // Activos, en el orden del panel; el destacado ocupa la tarjeta grande (va primero).
  const serviciosVisibles = [...n.servicios.filter((s) => s.activo)].sort((a, b) => Number(b.destacado) - Number(a.destacado));
  const enCotizador = new Set(opcionesPrincipales(n).map((o) => o.id));
  // Si el servicio no está en el cotizador, la tarjeta abre WhatsApp con el pedido armado.
  const presetServicio = (s) => (ver('cotizador') && enCotizador.has(s.id) ? '#cotizador' : wa(completar(n.mensajes.servicio, { servicio: s.nombre.toLowerCase() }, n)));
  const servicios = !ver('servicios') || !serviciosVisibles.length ? '' : `
  <section class="section" id="servicios" aria-labelledby="servicios-titulo">
    <div class="wrap">
      ${cabecera({ num: 'servicios', nombre: 'Servicios', t: sec.servicios.titulo, id: 'servicios-titulo', texto: sec.servicios.texto })}
      <ul class="bento">
        ${serviciosVisibles
          .map(
            (s, i) => `
        <li class="bento-item${i === 0 ? ' bento-grande' : ''}">
          <a class="servicio" href="${presetServicio(s)}" data-preset="${esc(s.id)}">
            ${foto(s.foto, s.fotoAlt, { sizes: i === 0 ? '(min-width: 1100px) 62vw, 92vw' : '(min-width: 1100px) 30vw, (min-width: 700px) 46vw, 92vw', clase: 'servicio-foto' })}
            <span class="servicio-cuerpo">
              <span class="dato servicio-num">${dos(i + 1)}</span>
              <span class="servicio-nombre">${esc(s.nombre)}</span>
              <span class="servicio-linea">${esc(s.linea)}</span>
              <span class="servicio-pie"><span class="servicio-precio">Desde <strong>${pesos(s.precio)}</strong></span><span class="dato servicio-tiempo">${esc(s.tiempo)}</span></span>
              <span class="servicio-cta">Pedir cotización ${flecha}</span>
            </span>
          </a>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>`;

  // ---------- Promociones (solo si hay alguna vigente) ----------
  const promociones = !ver('promociones') || !promos.length ? '' : `
  <section class="section" id="promociones" aria-labelledby="promociones-titulo">
    <div class="wrap">
      ${cabecera({ num: 'promociones', nombre: 'Promociones', t: sec.promociones.titulo, id: 'promociones-titulo', texto: sec.promociones.texto })}
      <ul class="promos">
        ${promos
          .map((pr) => {
            const destino = pr.preset && ver('cotizador') && enCotizador.has(pr.preset) ? '#cotizador' : wa(completar(n.mensajes.servicio, { servicio: pr.titulo.toLowerCase() }, n));
            const externo = destino.startsWith('http');
            return `
        <li>
          <article class="promo panel">
            ${pr.foto ? `<div class="promo-foto">${foto(pr.foto, pr.fotoAlt || pr.titulo, { sizes: '(min-width: 900px) 40vw, 92vw' })}</div>` : ''}
            <div class="promo-cuerpo">
              <h3 class="promo-titulo">${esc(pr.titulo)}</h3>
              ${pr.descripcion ? `<p class="promo-texto">${esc(pr.descripcion)}</p>` : ''}
              ${pr.precio != null ? `<p class="promo-precio">${pr.precioAnterior != null ? `<s class="dato">${pesos(pr.precioAnterior)}</s> ` : ''}<strong>${pesos(pr.precio)}</strong></p>` : ''}
              ${pr.hasta ? `<p class="dato promo-vence">Hasta el ${esc(pr.hasta.split('-').reverse().join('/'))}</p>` : ''}
              <a class="link-flecha" href="${esc(destino)}"${pr.preset && destino === '#cotizador' ? ` data-preset="${esc(pr.preset)}"` : ''}${externo ? ` ${ext}` : ''}>${destino === '#cotizador' ? 'Calcular mi presupuesto' : 'Pedir cotización'} ${flecha}</a>
            </div>
          </article>
        </li>`;
          })
          .join('')}
      </ul>
    </div>
  </section>`;

  // ---------- 04 · Resultados ----------
  const resultadosVisibles = n.resultados.filter((r) => r.visible && r.despues);
  const trabajosVisibles = [...n.trabajos.filter((t) => t.visible)].sort((a, b) => Number(b.destacado) - Number(a.destacado)).slice(0, Math.max(1, Number(sec.trabajos.maximo) || 6));
  const r0 = resultadosVisibles[0];
  const bloqueResultados = !ver('resultados') || !r0 ? '' : `
  <section class="section" id="resultados" aria-labelledby="resultados-titulo">
    <div class="wrap">
      ${cabecera({ num: 'resultados', nombre: 'Resultados', t: sec.resultados.titulo, id: 'resultados-titulo', texto: sec.resultados.texto })}
      <div class="resultados-grid">
        <figure class="comparador panel" id="comparador" style="--split:50%">
          ${resultadosVisibles
            .map(
              (r, i) => `
          <div class="par" data-par="${esc(r.id)}"${i ? ' hidden' : ''}>
            <div class="capa capa-der">${foto(r.despues, `Después: ${r.alt}`, { sizes: '(min-width: 1100px) 1000px, 100vw' })}</div>
            <div class="capa capa-izq${r.antes ? '' : ' simulada'}">${foto(r.antes ?? r.despues, `Antes: ${r.alt}`, { sizes: '(min-width: 1100px) 1000px, 100vw' })}</div>
          </div>`,
            )
            .join('')}
          <div class="comp-divisor" aria-hidden="true"><span class="comp-manija">${icono('flechas')}</span></div>
          <div class="comp-etiquetas" aria-hidden="true"><span class="dato">Antes · simulación</span><span class="dato">Después</span></div>
          <input class="comp-range" type="range" min="0" max="100" value="50" aria-label="Comparar antes y después">
        </figure>
        <div class="selector selector-vertical solo-js" role="group" aria-label="Elegí qué comparar">
          ${resultadosVisibles.map((r, i) => `<button type="button" class="selector-op" data-par="${esc(r.id)}" aria-pressed="${i === 0}">${esc(r.nombre)}</button>`).join('')}
        </div>
      </div>
      <p class="comp-pie dato" id="comp-pie" aria-live="polite">${esc(r0.pie)}</p>`;
  const bloqueTrabajos = !ver('trabajos') || !trabajosVisibles.length ? '' : `
      <div class="trabajos-head">
        <h3 class="subtitulo">${esc(sec.trabajos.titulo)}</h3>
        <a class="link-flecha" href="${esc(n.instagram.url)}" ${ext}>Ver más en Instagram ${flecha}</a>
      </div>
      <ul class="trabajos">
        ${trabajosVisibles
          .map(
            (t) => `
        <li>
          <figure class="trabajo">
            <div class="trabajo-foto">${foto(t.foto, t.fotoAlt, { sizes: '(min-width: 900px) 30vw, 92vw' })}</div>
            <figcaption><strong>${esc(t.auto)}</strong><span>${esc(t.servicio)}</span>${t.descripcion ? `<span class="trabajo-desc">${esc(t.descripcion)}</span>` : ''}</figcaption>
          </figure>
        </li>`,
          )
          .join('')}
      </ul>`;
  // Resultados y trabajos comparten sección: si se oculta una parte, la otra queda sola.
  const resultados = !bloqueResultados && !bloqueTrabajos ? '' : bloqueResultados
    ? `${bloqueResultados}${bloqueTrabajos}
    </div>
  </section>`
    : `
  <section class="section" id="resultados" aria-label="${esc(sec.trabajos.titulo)}">
    <div class="wrap">${bloqueTrabajos}
    </div>
  </section>`;

  // ---------- 05 · Proceso ----------
  const proceso = !ver('proceso') || !n.proceso.length ? '' : `
  <section class="section" id="proceso" aria-labelledby="proceso-titulo">
    <div class="wrap">
      ${cabecera({ num: 'proceso', nombre: 'Proceso', t: sec.proceso.titulo, id: 'proceso-titulo' })}
      <div class="proceso" id="proceso-linea">
        <div class="proceso-riel" aria-hidden="true"><i class="proceso-fill"></i></div>
        <ol class="pasos">
          ${n.proceso
            .map(
              (s, i) => `
          <li class="paso">
            <span class="paso-marca dato" aria-hidden="true">${dos(i + 1)}</span>
            <div class="paso-texto"><h3><span class="visually-hidden">Paso ${i + 1}: </span>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>
            <div class="paso-foto">${foto(s.foto, s.fotoAlt, { sizes: '(min-width: 900px) 420px, 80vw' })}</div>
          </li>`,
            )
            .join('')}
        </ol>
      </div>
    </div>
  </section>`;

  // ---------- 06 · Presupuesto ----------
  const cot = n.cotizador;
  const def = cot.porDefecto;
  const inicial = calcular(n, { tamano: def.tamano, principal: def.principal, estado: def.estado, extras: [] });
  const paquetesActivos = n.paquetes.filter((pk) => pk.activo);
  const sueltos = opcionesPrincipales(n).filter((o) => o.tipo === 'servicio');
  const resumenLinea = (r) => `${r.tamano.nombre} · ${r.principal.nombre} · ${r.estado.nombre}`;
  const cotizador = !ver('cotizador') || !tamanosActivos(n).length || !opcionesPrincipales(n).length ? '' : `
  <section class="section" id="cotizador" aria-labelledby="cotizador-titulo">
    <div class="wrap">
      ${cabecera({ num: 'cotizador', nombre: 'Presupuesto', t: sec.cotizador.titulo, id: 'cotizador-titulo', texto: sec.cotizador.texto })}
      <form class="cotizador" id="cotizador-form" novalidate>
        <div class="cot-pasos">
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">1</span>Tamaño</legend>
            <div class="opciones-tamano">
              ${tamanosActivos(n)
                .map(
                  (t) => `<label class="opcion-card"><input type="radio" name="tamano" value="${esc(t.id)}"${t.id === def.tamano ? ' checked' : ''}>${silueta(t.silueta)}<strong>${esc(t.nombre)}</strong><small>${esc(t.ejemplo)}</small></label>`,
                )
                .join('')}
            </div>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">2</span>Paquete</legend>
            ${paquetesActivos.length ? `<div class="opciones-paquete">
              ${paquetesActivos
                .map(
                  (pk) => `<label class="opcion-card opcion-paquete"><input type="radio" name="principal" value="${esc(pk.id)}"${pk.id === def.principal ? ' checked' : ''}><strong>${esc(pk.nombre)}</strong><small>Desde ${pesos(pk.precio)}</small><ul>${pk.incluye.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></label>`,
                )
                .join('')}
            </div>` : ''}
            ${sueltos.length ? `<p class="grupo-sub">${paquetesActivos.length ? 'O un servicio suelto' : 'Elegí un servicio'}</p>
            <div class="chips">${sueltos.map((s) => `<label class="opcion-chip"><input type="radio" name="principal" value="${esc(s.id)}"${s.id === def.principal ? ' checked' : ''}><span>${esc(s.nombre)}</span></label>`).join('')}</div>` : ''}
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">3</span>Estado de la pintura</legend>
            <input class="estado-range" id="estado" name="estado" type="range" min="0" max="${cot.estados.length - 1}" step="1" value="${def.estado}" aria-valuetext="${esc(cot.estados[def.estado].nombre)}" aria-describedby="estado-nota">
            <div class="estado-marcas" aria-hidden="true">${cot.estados.map((e, i) => `<span data-estado="${i}"${i === def.estado ? ' class="activo"' : ''}>${esc(e.nombre)}<small class="dato">+${Math.round(e.recargo * 100)} %</small></span>`).join('')}</div>
            <p class="grupo-sub" id="estado-nota">${inicial.aplicaEstado ? 'Cuantas más marcas, más trabajo de pulido.' : 'No cambia el precio de este servicio.'}</p>
          </fieldset>
          ${extrasActivos(n).length ? `<fieldset class="grupo">
            <legend><span class="grupo-num dato">4</span>Extras</legend>
            <div class="chips">${extrasActivos(n).map((e) => `<label class="opcion-chip"><input type="checkbox" name="extras" value="${esc(e.id)}"><span>${esc(e.nombre)} <small class="dato">+${pesos(e.precio)}</small></span></label>`).join('')}</div>
          </fieldset>` : ''}
        </div>
        <aside class="cot-resumen panel" id="cot-resumen" aria-labelledby="resumen-titulo" data-tamano="${esc(inicial.tamano.silueta ?? 'mediano')}">
          <h3 class="visually-hidden" id="resumen-titulo">Tu presupuesto</h3>
          <div class="cot-auto" aria-hidden="true">${['chico', 'mediano', 'suv', 'grande'].map((k) => silueta(k, `cot-silueta cot-silueta-${k}`)).join('')}</div>
          <p class="dato cot-linea" id="cot-linea">${esc(resumenLinea(inicial))}</p>
          <p class="cot-total"><output id="cot-total" aria-live="polite">${pesos(inicial.total)}</output> <span class="dato">estimado</span></p>
          <dl class="cot-desglose" id="cot-desglose">${inicial.desglose.map((d) => `<div><dt>${esc(d.concepto)}</dt><dd class="dato">${pesos(d.monto)}</dd></div>`).join('')}</dl>
          <p class="cot-tiempo">Tiempo en el taller: <strong class="dato" id="cot-tiempo">${esc(inicial.tiempo)}</strong></p>
          <div class="cot-campos">
            <div class="campo">
              <label for="cot-nombre">Tu nombre <span class="opcional">(opcional)</span></label>
              <input id="cot-nombre" name="nombre" type="text" autocomplete="given-name" maxlength="40">
            </div>
            <div class="campo">
              <label for="cot-telefono">Tu WhatsApp <span class="opcional">(opcional)</span></label>
              <input id="cot-telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Ej.: 2284 123456">
            </div>
          </div>
          <div class="cot-trampa" aria-hidden="true"><label>No completar <input name="web" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn btn-acento btn-full" type="submit">Pedir cotización por WhatsApp ${flecha}</button>
          ${cot.nota ? `<p class="nota">${esc(cot.nota)}</p>` : ''}
          ${cot.condiciones ? `<p class="nota cot-condiciones">${esc(cot.condiciones)}</p>` : ''}
          ${cot.privacidad ? `<p class="nota cot-privacidad">${esc(cot.privacidad)}</p>` : ''}
        </aside>
      </form>
    </div>
  </section>`;

  // ---------- 07 · Opiniones ----------
  const opinionesVisibles = n.opiniones.filter((o) => o.visible && o.texto);
  const hayEjemplos = opinionesVisibles.some((o) => o.ejemplo);
  const opiniones = !ver('opiniones') || !opinionesVisibles.length ? '' : `
  <section class="section" id="opiniones" aria-labelledby="opiniones-titulo">
    <div class="wrap">
      ${cabecera({ num: 'opiniones', nombre: 'Opiniones', t: sec.opiniones.titulo, id: 'opiniones-titulo' })}
      <ul class="opiniones">
        ${opinionesVisibles
          .map(
            (o) => `
        <li class="opinion panel">
          <p class="estrellas" role="img" aria-label="${o.estrellas} de 5 estrellas">${Array.from({ length: 5 }, (_, i) => `<span class="${i < o.estrellas ? 'on' : ''}">${icono('estrella')}</span>`).join('')}</p>
          <blockquote>${esc(o.texto)}</blockquote>
          <p class="opinion-autor">${o.foto ? `<span class="opinion-foto">${foto(o.foto, '', { sizes: '48px', decorativa: true })}</span>` : ''}<strong>${esc(o.nombre)}</strong><span>${esc(o.auto)}</span></p>
        </li>`,
          )
          .join('')}
      </ul>
      ${hayEjemplos && n.opinionesNota ? `<p class="nota">${esc(n.opinionesNota)}</p>` : ''}
    </div>
  </section>`;

  // ---------- 08 · Contacto + preguntas ----------
  const comoLlegar = n.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${n.mapa.lat},${n.mapa.lng}`;
  const verContacto = ver('contacto');
  const verPreguntas = ver('preguntas') && n.preguntas.length > 0;
  const verMapa = ver('mapa');
  const horario = n.horario.map((x) => `${esc(x.dias)}: ${esc(x.horas)}`).join('<br>');
  const contacto = !verContacto && !verPreguntas && !verMapa ? '' : `
  <section class="section" id="contacto" aria-labelledby="${verContacto ? 'contacto-titulo' : 'preguntas-titulo'}">
    ${verContacto || verPreguntas ? `<div class="wrap contacto-grid${verContacto && verPreguntas ? '' : ' contacto-grid-uno'}">
      ${verContacto ? `<div class="contacto-panel panel">
        ${etiqueta('contacto', 'Contacto')}
        ${titulo(sec.contacto.titulo, { id: 'contacto-titulo' })}
        ${sec.contacto.texto ? `<p class="lead">${esc(sec.contacto.texto)}</p>` : ''}
        <dl class="datos-contacto">
          <div><dt>Dirección</dt><dd>${esc(n.direccion)}<br><a class="link-flecha" href="${esc(comoLlegar)}" ${ext}>Cómo llegar ${flecha}</a></dd></div>
          <div><dt>Horario</dt><dd>${horario}</dd></div>
          <div><dt>WhatsApp</dt><dd><a href="${waCotizacion}" ${ext}>${telefono('dato')}</a></dd></div>
          ${n.telefono ? `<div><dt>Teléfono</dt><dd><a href="tel:${esc(n.telefono.replace(/[^\d+]/g, ''))}">${esc(n.telefono)}</a></dd></div>` : ''}
          ${n.email ? `<div><dt>Email</dt><dd><a href="mailto:${esc(n.email)}">${esc(n.email)}</a></dd></div>` : ''}
          ${n.instagram.url ? `<div><dt>Instagram</dt><dd><a href="${esc(n.instagram.url)}" ${ext}>${esc(n.instagram.usuario || 'Instagram')}</a></dd></div>` : ''}
        </dl>
        <a class="btn btn-acento contacto-cta" href="${waCotizacion}" ${ext}>Pedir cotización por WhatsApp ${flecha}</a>
      </div>` : ''}
      ${verPreguntas ? `<div class="faq" id="preguntas">
        <h3 class="subtitulo" id="preguntas-titulo">${esc(sec.preguntas.titulo)}</h3>
        <div class="faq-lista">
          ${n.preguntas.map((q) => `<details><summary>${esc(q.pregunta)}<span class="faq-icono" aria-hidden="true"></span></summary><p>${esc(q.respuesta)}</p></details>`).join('')}
        </div>
      </div>` : ''}
    </div>` : ''}
    ${verMapa ? `<div class="wrap">
      <div class="mapa panel" id="mapa">
        <a class="mapa-fallback" href="${esc(comoLlegar)}" ${ext}>${icono('pin')} Ver ${esc(n.direccionCorta)} en el mapa</a>
      </div>
    </div>` : ''}
  </section>`;

  // ---------- Footer ----------
  const footer = `
  <footer class="footer">
    <div class="wrap footer-grid">
      <div class="footer-marca">${marca}<p>${esc(n.lema)}, ${esc(n.region)}</p></div>
      <nav aria-label="Secciones"><p class="footer-tit">Secciones</p><ul>${[...links, ['#contacto', 'Contacto']].map(([hh, t]) => `<li><a href="${hh}">${t}</a></li>`).join('')}</ul></nav>
      <div><p class="footer-tit">Contacto</p><ul>
        <li><a href="${waCotizacion}" ${ext}>WhatsApp ${telefono()}</a></li>
        ${n.instagram.url ? `<li><a href="${esc(n.instagram.url)}" ${ext}>Instagram ${esc(n.instagram.usuario)}</a></li>` : ''}
        ${n.redes.map((r) => `<li><a href="${esc(r.url)}" ${ext}>${esc(r.nombre || r.url)}</a></li>`).join('')}
        ${n.email ? `<li><a href="mailto:${esc(n.email)}">${esc(n.email)}</a></li>` : ''}
        <li>${esc(n.direccion)}</li>
        <li>${esc(n.horarioCorto)}</li>
      </ul></div>
    </div>
    <p class="wordmark" aria-hidden="true">${esc(n.nombreCorto)}</p>
    <p class="wrap footer-demo">${n.demo.activo && n.demo.aviso ? `${esc(n.demo.aviso)} · ` : ''}© <span id="anio">${hoy.getFullYear()}</span> ${esc(n.nombre)}</p>
  </footer>
  <div class="barra-movil" id="barra-movil">
    ${ver('cotizador') ? '<a class="btn btn-borde" href="#cotizador">Presupuesto</a>' : ''}
    <a class="btn btn-acento" href="${waCotizacion}" ${ext}>Pedir cotización</a>
  </div>
  ${cotizador ? '' : '<!-- sin cotizador -->'}<div class="barra-cotizador" id="barra-cotizador"${cotizador ? '' : ' hidden'}>
    <p><span>Estimado</span><output id="barra-total">${pesos(inicial.total)}</output></p>
    <button type="submit" form="cotizador-form" class="btn btn-acento">Pedir cotización</button>
  </div>`;

  const aviso = opciones.preview ? `<div class="aviso-preview" role="status">Vista previa · ${esc(opciones.preview)}</div>` : '';
  const datos = `<script type="application/json" id="datos-negocio">${jsonSeguro(datosCliente(n))}</script>`;
  const cuerpo = `${aviso}${header}<main id="contenido">${hero}${manifiesto}${pulido}${ceramico}${servicios}${promociones}${resultados}${proceso}${cotizador}${opiniones}${contacto}</main>${footer}${datos}`;

  return conHead(html.replace('<!--@pagina-->', `${MARCAS.cuerpoIni}${cuerpo}${MARCAS.cuerpoFin}`), n, imagenes, opciones);
}

// <head>: título, descripción, Open Graph y favicon (módulo SEO del panel).
export function renderHead(negocio, imagenes = {}, opciones = {}) {
  const n = normalizar(negocio);
  const titulo = n.seo.titulo || `${n.nombre}${n.ciudad ? ` · ${n.ciudad}` : ''}`;
  const descripcion = n.seo.descripcion || n.descripcion || `${n.nombre}: detailing en ${n.ciudad}.`;
  const abs = (u) => (!u ? '' : /^https?:/i.test(u) ? u : opciones.origen ? `${opciones.origen.replace(/\/$/, '')}${u}` : u);
  const og = n.seo.imagen ? (typeof n.seo.imagen === 'object' ? n.seo.imagen.src : imagenes[n.seo.imagen] ? `/img/${n.seo.imagen}.webp` : '') : n.hero.foto && typeof n.hero.foto === 'object' ? n.hero.foto.src : imagenes[n.hero.foto] ? `/img/${n.hero.foto}.webp` : '';
  const favicon = n.seo.favicon && typeof n.seo.favicon === 'object' ? n.seo.favicon.src : '/favicon.svg';
  return [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(descripcion)}">`,
    og ? `<meta property="og:image" content="${esc(abs(og))}">` : '',
    `<meta name="twitter:card" content="${og ? 'summary_large_image' : 'summary'}">`,
    `<link rel="icon" href="${esc(favicon)}"${favicon.endsWith('.svg') ? ' type="image/svg+xml"' : ''}>`,
    opciones.noindex ? '<meta name="robots" content="noindex">' : '',
  ]
    .filter(Boolean)
    .join('\n  ');
}

function conHead(html, n, imagenes, opciones) {
  return html.replace('<!--@head-->', `${MARCAS.headIni}\n  ${renderHead(n, imagenes, opciones)}\n  ${MARCAS.headFin}`);
}

// Re-render en el servidor: reemplaza head y cuerpo dentro de la plantilla que dejó el build.
export function renderSobrePlantilla(plantilla, negocio, imagenes = {}, opciones = {}) {
  const cortar = (html, ini, fin, nuevo) => {
    const a = html.indexOf(ini);
    const b = html.indexOf(fin);
    if (a < 0 || b < 0) throw new Error('Plantilla sin marcadores');
    return html.slice(0, a) + nuevo + html.slice(b + fin.length);
  };
  const tmp = cortar(cortar(plantilla, MARCAS.headIni, MARCAS.headFin, '<!--@head-->'), MARCAS.cuerpoIni, MARCAS.cuerpoFin, '<!--@pagina-->');
  return renderPagina(tmp, negocio, imagenes, opciones);
}


