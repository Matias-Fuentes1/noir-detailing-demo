// Arma todo el HTML de la página desde src/config/negocio.json.
// Se ejecuta en Vite (dev y build), así el contenido queda en el HTML y se ve sin JavaScript.
// Orden de bloques: hero · manifiesto · 01 pulido · 02 cerámico · 03 servicios · 04 resultados ·
// 05 proceso · 06 presupuesto · 07 opiniones · 08 contacto + preguntas · footer.
import { calcular, pesos, linkWhatsApp, opcionesPrincipales, completar, esNumeroEjemplo } from '../src/js/calculo.js';
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

export function renderPagina(html, negocio, imagenes) {
  const n = negocio;
  const wa = (texto) => esc(linkWhatsApp(n, texto));
  const waCotizacion = wa(completar(n.mensajes.cotizacion, n));
  const ejemplo = esNumeroEjemplo(n);
  const telefono = (clase = '') =>
    `<span class="${clase}">${esc(n.telefonoVisible)}${ejemplo ? ' <small class="ejemplo">(ejemplo)</small>' : ''}</span>`;
  const ext = 'target="_blank" rel="noopener"';

  // Foto con srcset (800 y 1600 px). Si falta, avisa en la consola del build y deja un panel liso.
  const foto = (nombre, alt, { sizes = '100vw', eager = false, clase = '', decorativa = false } = {}) => {
    const datos = imagenes[nombre];
    if (!datos) {
      console.warn(`[pagina] Falta la foto "${nombre}" en fotos/. Se muestra un panel liso.`);
      return `<div class="ph ${clase}"${decorativa ? ' aria-hidden="true"' : ` role="img" aria-label="${esc(alt)}"`}></div>`;
    }
    const chico = Math.min(800, datos.w);
    return `<img class="${clase}" src="/img/${nombre}.webp" srcset="/img/${nombre}-800.webp ${chico}w, /img/${nombre}.webp ${datos.w}w" sizes="${sizes}" width="${datos.w}" height="${datos.h}" alt="${decorativa ? '' : esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  };

  // Título de dos líneas: la primera sólida, la segunda en outline. Cada línea entra con máscara.
  const titulo = ([l1, l2], { tag = 'h2', id = '', clase = '' } = {}) =>
    `<${tag} class="titulo ${clase}"${id ? ` id="${id}"` : ''}><span class="linea"><span>${esc(l1)}</span></span>${l2 ? ` <span class="linea linea-2"><span>${esc(l2)}</span></span>` : ''}</${tag}>`;

  // Etiqueta "— 01 · PULIDO" sobre cada h2 (numeración correlativa).
  const etiqueta = (num, texto) => `<p class="etiqueta"><span>${dos(num)}</span> · ${esc(texto)}</p>`;

  const cabecera = ({ num, nombre, t, id, texto, clase = '' }) => `
      <div class="cabecera ${clase}">
        <div>${etiqueta(num, nombre)}${titulo(t, { id })}</div>
        ${texto ? `<p class="lead">${esc(texto)}</p>` : ''}
      </div>`;

  const marca = `<a class="brand" href="#inicio" aria-label="${esc(n.nombre)}, ir al inicio"><span class="brand-name">${esc(n.nombreCorto)}</span><span class="brand-sub">Detailing · ${esc(n.ciudad)}</span></a>`;

  const links = [
    ['#pulido', 'Pulido'],
    ['#ceramico', 'Cerámico'],
    ['#servicios', 'Servicios'],
    ['#resultados', 'Resultados'],
    ['#cotizador', 'Presupuesto'],
  ];

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
          <a class="btn btn-acento" href="#cotizador">Calcular mi presupuesto ${flecha}</a>
          <a class="btn btn-borde" href="#resultados">Ver resultados</a>
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
  const manifiesto = `
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
  const pulido = `
  <section class="section" id="pulido" aria-labelledby="pulido-titulo">
    <div class="wrap pulido-grid">
      <div class="pulido-copy">
        ${etiqueta(1, 'Pulido')}
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
  const ceramico = `
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
          ${etiqueta(2, 'Cerámico')}
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
            const pk = n.paquetes.find((x) => x.id === d.paquete);
            return `<li><a class="duracion panel${d.destacado ? ' duracion-destacada' : ''}" href="#cotizador" data-preset="${esc(d.paquete)}"><span class="duracion-anios">${esc(d.anios)}</span><span class="duracion-paquete">${esc(pk?.nombre ?? '')}</span><span class="duracion-texto">${esc(d.texto)}</span><span class="duracion-link">Calcular mi presupuesto ${flecha}</span></a></li>`;
          })
          .join('')}
      </ul>
    </div>
  </section>`;

  // ---------- 03 · Servicios ----------
  const servicios = `
  <section class="section" id="servicios" aria-labelledby="servicios-titulo">
    <div class="wrap">
      ${cabecera({ num: 3, nombre: 'Servicios', t: ['Todo lo que tu auto', 'se merece.'], id: 'servicios-titulo', texto: 'Precios desde, para un auto chico. El valor final depende del tamaño y del estado de la pintura.' })}
      <ul class="bento">
        ${n.servicios
          .map(
            (s, i) => `
        <li class="bento-item${i === 0 ? ' bento-grande' : ''}">
          <a class="servicio" href="#cotizador" data-preset="${esc(s.id)}">
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

  // ---------- 04 · Resultados ----------
  const r0 = n.resultados[0];
  const resultados = `
  <section class="section" id="resultados" aria-labelledby="resultados-titulo">
    <div class="wrap">
      ${cabecera({ num: 4, nombre: 'Resultados', t: ['De cansado', 'a terminado.'], id: 'resultados-titulo', texto: 'Arrastrá la línea, o usá las flechas del teclado, para comparar el antes y el después.' })}
      <div class="resultados-grid">
        <figure class="comparador panel" id="comparador" style="--split:50%">
          ${n.resultados
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
          ${n.resultados.map((r, i) => `<button type="button" class="selector-op" data-par="${esc(r.id)}" aria-pressed="${i === 0}">${esc(r.nombre)}</button>`).join('')}
        </div>
      </div>
      <p class="comp-pie dato" id="comp-pie" aria-live="polite">${esc(r0.pie)}</p>

      <div class="trabajos-head">
        <h3 class="subtitulo">Trabajos recientes</h3>
        <a class="link-flecha" href="${esc(n.instagram.url)}" ${ext}>Ver más en Instagram ${flecha}</a>
      </div>
      <ul class="trabajos">
        ${n.trabajos
          .map(
            (t) => `
        <li>
          <figure class="trabajo">
            <div class="trabajo-foto">${foto(t.foto, t.fotoAlt, { sizes: '(min-width: 900px) 30vw, 92vw' })}</div>
            <figcaption><strong>${esc(t.auto)}</strong><span>${esc(t.servicio)}</span></figcaption>
          </figure>
        </li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>`;

  // ---------- 05 · Proceso ----------
  const proceso = `
  <section class="section" id="proceso" aria-labelledby="proceso-titulo">
    <div class="wrap">
      ${cabecera({ num: 5, nombre: 'Proceso', t: ['Cinco pasos.', 'Cero sorpresas.'], id: 'proceso-titulo' })}
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
  const resumenLinea = (r) => `${r.tamano.nombre} · ${r.principal.nombre} · ${r.estado.nombre}`;
  const cotizador = `
  <section class="section" id="cotizador" aria-labelledby="cotizador-titulo">
    <div class="wrap">
      ${cabecera({ num: 6, nombre: 'Presupuesto', t: ['Armalo.', 'Mirá el precio.'], id: 'cotizador-titulo', texto: 'Elegí tu auto y lo que querés hacerle. El precio cambia al instante y lo mandás por WhatsApp.' })}
      <form class="cotizador" id="cotizador-form" novalidate>
        <div class="cot-pasos">
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">1</span>Tamaño</legend>
            <div class="opciones-tamano">
              ${cot.tamanos
                .map(
                  (t) => `<label class="opcion-card"><input type="radio" name="tamano" value="${t.id}"${t.id === def.tamano ? ' checked' : ''}>${silueta(t.id)}<strong>${esc(t.nombre)}</strong><small>${esc(t.ejemplo)}</small></label>`,
                )
                .join('')}
            </div>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">2</span>Paquete</legend>
            <div class="opciones-paquete">
              ${n.paquetes
                .map(
                  (pk) => `<label class="opcion-card opcion-paquete"><input type="radio" name="principal" value="${pk.id}"${pk.id === def.principal ? ' checked' : ''}><strong>${esc(pk.nombre)}</strong><small>Desde ${pesos(pk.precio)}</small><ul>${pk.incluye.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></label>`,
                )
                .join('')}
            </div>
            <p class="grupo-sub">O un servicio suelto</p>
            <div class="chips">${n.servicios.map((s) => `<label class="opcion-chip"><input type="radio" name="principal" value="${s.id}"><span>${esc(s.nombre)}</span></label>`).join('')}</div>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">3</span>Estado de la pintura</legend>
            <input class="estado-range" id="estado" name="estado" type="range" min="0" max="${cot.estados.length - 1}" step="1" value="${def.estado}" aria-valuetext="${esc(cot.estados[def.estado].nombre)}" aria-describedby="estado-nota">
            <div class="estado-marcas" aria-hidden="true">${cot.estados.map((e, i) => `<span data-estado="${i}"${i === def.estado ? ' class="activo"' : ''}>${esc(e.nombre)}<small class="dato">+${Math.round(e.recargo * 100)} %</small></span>`).join('')}</div>
            <p class="grupo-sub" id="estado-nota">${inicial.aplicaEstado ? 'Cuantas más marcas, más trabajo de pulido.' : 'No cambia el precio de este servicio.'}</p>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num dato">4</span>Extras</legend>
            <div class="chips">${cot.extras.map((e) => `<label class="opcion-chip"><input type="checkbox" name="extras" value="${e.id}"><span>${esc(e.nombre)} <small class="dato">+${pesos(e.precio)}</small></span></label>`).join('')}</div>
          </fieldset>
        </div>
        <aside class="cot-resumen panel" id="cot-resumen" aria-labelledby="resumen-titulo" data-tamano="${def.tamano}">
          <h3 class="visually-hidden" id="resumen-titulo">Tu presupuesto</h3>
          <div class="cot-auto" aria-hidden="true">${cot.tamanos.map((t) => silueta(t.id, `cot-silueta cot-silueta-${t.id}`)).join('')}</div>
          <p class="dato cot-linea" id="cot-linea">${esc(resumenLinea(inicial))}</p>
          <p class="cot-total"><output id="cot-total" aria-live="polite">${pesos(inicial.total)}</output> <span class="dato">estimado</span></p>
          <dl class="cot-desglose" id="cot-desglose">${inicial.desglose.map((d) => `<div><dt>${esc(d.concepto)}</dt><dd class="dato">${pesos(d.monto)}</dd></div>`).join('')}</dl>
          <p class="cot-tiempo">Tiempo en el taller: <strong class="dato" id="cot-tiempo">${esc(inicial.tiempo)}</strong></p>
          <div class="campo">
            <label for="cot-nombre">Tu nombre <span class="opcional">(opcional)</span></label>
            <input id="cot-nombre" name="nombre" type="text" autocomplete="given-name" maxlength="40">
          </div>
          <button class="btn btn-acento btn-full" type="submit">Pedir cotización por WhatsApp ${flecha}</button>
          <p class="nota">${esc(cot.nota)}</p>
        </aside>
      </form>
    </div>
  </section>`;

  // ---------- 07 · Opiniones ----------
  const opiniones = `
  <section class="section" id="opiniones" aria-labelledby="opiniones-titulo">
    <div class="wrap">
      ${cabecera({ num: 7, nombre: 'Opiniones', t: ['Te lo devolvemos', 'impecable.'], id: 'opiniones-titulo' })}
      <ul class="opiniones">
        ${n.opiniones
          .map(
            (o) => `
        <li class="opinion panel">
          <p class="estrellas" role="img" aria-label="${o.estrellas} de 5 estrellas">${Array.from({ length: 5 }, (_, i) => `<span class="${i < o.estrellas ? 'on' : ''}">${icono('estrella')}</span>`).join('')}</p>
          <blockquote>${esc(o.texto)}</blockquote>
          <p class="opinion-autor"><strong>${esc(o.nombre)}</strong><span>${esc(o.auto)}</span></p>
        </li>`,
          )
          .join('')}
      </ul>
      <p class="nota">${esc(n.opinionesNota)}</p>
    </div>
  </section>`;

  // ---------- 08 · Contacto + preguntas ----------
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${n.mapa.lat},${n.mapa.lng}`;
  const horario = n.horario.map((x) => `${esc(x.dias)}: ${esc(x.horas)}`).join('<br>');
  const contacto = `
  <section class="section" id="contacto" aria-labelledby="contacto-titulo">
    <div class="wrap contacto-grid">
      <div class="contacto-panel panel">
        ${etiqueta(8, 'Contacto')}
        ${titulo(n.contacto.titulo, { id: 'contacto-titulo' })}
        <dl class="datos-contacto">
          <div><dt>Dirección</dt><dd>${esc(n.direccion)}<br><a class="link-flecha" href="${esc(comoLlegar)}" ${ext}>Cómo llegar ${flecha}</a></dd></div>
          <div><dt>Horario</dt><dd>${horario}</dd></div>
          <div><dt>WhatsApp</dt><dd><a href="${waCotizacion}" ${ext}>${telefono('dato')}</a></dd></div>
          <div><dt>Instagram</dt><dd><a href="${esc(n.instagram.url)}" ${ext}>${esc(n.instagram.usuario)}</a></dd></div>
        </dl>
        <a class="btn btn-acento contacto-cta" href="${waCotizacion}" ${ext}>Pedir cotización por WhatsApp ${flecha}</a>
      </div>
      <div class="faq" id="preguntas">
        <h3 class="subtitulo">Preguntas frecuentes</h3>
        <div class="faq-lista">
          ${n.preguntas.map((q) => `<details><summary>${esc(q.pregunta)}<span class="faq-icono" aria-hidden="true"></span></summary><p>${esc(q.respuesta)}</p></details>`).join('')}
        </div>
      </div>
    </div>
    <div class="wrap">
      <div class="mapa panel" id="mapa">
        <a class="mapa-fallback" href="${esc(comoLlegar)}" ${ext}>${icono('pin')} Ver ${esc(n.direccionCorta)} en el mapa</a>
      </div>
    </div>
  </section>`;

  // ---------- Footer ----------
  const footer = `
  <footer class="footer">
    <div class="wrap footer-grid">
      <div class="footer-marca">${marca}<p>${esc(n.lema)}, ${esc(n.region)}</p></div>
      <nav aria-label="Secciones"><p class="footer-tit">Secciones</p><ul>${[...links, ['#contacto', 'Contacto']].map(([hh, t]) => `<li><a href="${hh}">${t}</a></li>`).join('')}</ul></nav>
      <div><p class="footer-tit">Contacto</p><ul>
        <li><a href="${waCotizacion}" ${ext}>WhatsApp ${telefono()}</a></li>
        <li><a href="${esc(n.instagram.url)}" ${ext}>Instagram ${esc(n.instagram.usuario)}</a></li>
        <li>${esc(n.direccion)}</li>
        <li>${esc(n.horarioCorto)}</li>
      </ul></div>
    </div>
    <p class="wordmark" aria-hidden="true">${esc(n.nombreCorto)}</p>
    <p class="wrap footer-demo">${esc(n.avisoDemo)} · © <span id="anio">${new Date().getFullYear()}</span></p>
  </footer>
  <div class="barra-movil" id="barra-movil">
    <a class="btn btn-borde" href="#cotizador">Presupuesto</a>
    <a class="btn btn-acento" href="${waCotizacion}" ${ext}>Pedir cotización</a>
  </div>
  <div class="barra-cotizador" id="barra-cotizador">
    <p><span>Estimado</span><output id="barra-total">${pesos(inicial.total)}</output></p>
    <button type="submit" form="cotizador-form" class="btn btn-acento">Pedir cotización</button>
  </div>`;

  const cuerpo = `${header}<main id="contenido">${hero}${manifiesto}${pulido}${ceramico}${servicios}${resultados}${proceso}${cotizador}${opiniones}${contacto}</main>${footer}`;

  return html
    .replace('<!--@pagina-->', cuerpo)
    .replace(/\{\{(\w+)\}\}/g, (mm, k) => esc(n[k] ?? mm));
}

// Exportado para el cliente: lista de opciones del cotizador (paquetes + servicios).
export { opcionesPrincipales };
