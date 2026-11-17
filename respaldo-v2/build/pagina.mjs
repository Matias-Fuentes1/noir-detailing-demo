// Arma todo el HTML de la página desde src/config/negocio.json.
// Se ejecuta en Vite (dev y build), así el contenido queda en el HTML y se ve sin JavaScript.
import { calcular, pesos, linkWhatsApp, opcionesPrincipales, completar } from '../src/js/calculo.js';
import { icono } from './iconos.mjs';

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderPagina(html, negocio, imagenes) {
  const n = negocio;
  const wa = (texto) => esc(linkWhatsApp(n, texto));
  const waTurno = wa(completar(n.mensajes.turno, n));
  const tel = `tel:+${n.whatsapp}`;

  // Foto con srcset si existe en public/img; si no, un placeholder con la descripción de la foto que falta.
  const foto = (nombre, alt, { sizes = '100vw', eager = false, clase = '', pendiente = '' } = {}) => {
    const datos = imagenes[nombre];
    if (!datos) {
      return `<div class="ph ${clase}" role="img" aria-label="${esc(alt)}"><span class="ph-texto">${icono('camara')}<span><b>Foto pendiente</b>${esc(pendiente || alt)}</span></span></div>`;
    }
    const chico = Math.min(800, datos.w);
    return `<img class="${clase}" src="/img/${nombre}.webp" srcset="/img/${nombre}-800.webp ${chico}w, /img/${nombre}.webp ${datos.w}w" sizes="${sizes}" width="${datos.w}" height="${datos.h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  };

  const titulo = (t, destacado, tag = 'h2', id = '') =>
    `<${tag} class="titulo"${id ? ` id="${id}"` : ''}>${esc(t)} <em>${esc(destacado)}</em></${tag}>`;

  const cabecera = ({ eyebrow, t, d, texto, id }) => `
      <div class="cabecera">
        <p class="eyebrow">${esc(eyebrow)}</p>
        ${titulo(t, d, 'h2', id)}
        ${texto ? `<p class="lead">${esc(texto)}</p>` : ''}
      </div>`;

  const marca = `<a class="brand" href="#inicio" aria-label="${esc(n.nombre)}, ir al inicio"><span class="brand-mark" aria-hidden="true">${esc(n.nombreCorto.charAt(0))}</span><span class="brand-txt"><span class="brand-name">${esc(n.nombreCorto)}</span><span class="brand-sub">Detailing · ${esc(n.ciudad)}</span></span></a>`;

  // ---------- Header ----------
  const header = `
  <p class="aviso-demo">${esc(n.avisoDemo)}</p>
  <header class="header" id="header">
    <div class="header-in">
      ${marca}
      <nav class="nav" id="menu" aria-label="Principal">
        <a href="#servicios">Servicios</a><a href="#trabajos">Trabajos</a><a href="#precios">Precios</a><a href="#preguntas">Preguntas</a><a href="#contacto">Contacto</a>
        <a class="nav-wa" href="${waTurno}" target="_blank" rel="noopener">${icono('whatsapp')} Pedir turno por WhatsApp</a>
      </nav>
      <div class="header-acciones">
        <a class="header-tel" href="${tel}">${icono('telefono')}<span>${esc(n.telefonoVisible)}</span></a>
        <a class="btn btn-acid header-cta" href="${waTurno}" target="_blank" rel="noopener">Pedir turno</a>
        <a class="icon-btn icon-btn-acid solo-movil" href="${waTurno}" target="_blank" rel="noopener" aria-label="Pedir turno por WhatsApp">${icono('whatsapp')}</a>
        <button class="icon-btn menu-btn solo-movil" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">${icono('menu')}</button>
      </div>
    </div>
  </header>`;

  // ---------- Hero ----------
  const h = n.hero;
  const hero = `
  <section class="hero" id="inicio" aria-labelledby="hero-titulo">
    <div class="hero-media" id="hero-media">
      ${foto(h.foto, h.fotoAlt, { eager: true, clase: 'hero-foto' })}
      <canvas class="hero-sucio" id="hero-sucio" aria-hidden="true"></canvas>
      <div class="hero-linea" aria-hidden="true"></div>
    </div>
    <div class="wrap hero-contenido">
      ${titulo(h.titulo, h.tituloDestacado, 'h1', 'hero-titulo')}
      <p class="hero-bajada">${esc(h.bajada)}</p>
      <div class="botones">
        <a class="btn btn-acid" href="#cotizador">${icono('calculadora')} Calcular mi presupuesto</a>
        <a class="btn btn-borde" href="${waTurno}" target="_blank" rel="noopener">${icono('whatsapp')} Pedir turno por WhatsApp</a>
      </div>
      <div class="hero-pulido solo-js">
        <p class="hero-pista">${icono('mano')} Pasá el mouse o el dedo por la foto para pulirla.</p>
        <div class="hero-controles">
          <label class="hero-slider"><span>Opaco</span><input id="hero-range" type="range" min="0" max="100" value="55" aria-label="Pulir la foto: de opaco a pulido"><span>Pulido</span></label>
          <div class="brillo" aria-live="off">
            <span class="brillo-label">Brillo</span>
            <span class="brillo-barra" aria-hidden="true"><i id="brillo-fill"></i></span>
            <output class="dato" id="brillo-valor" for="hero-range">55</output>
          </div>
        </div>
      </div>
    </div>
  </section>
  <ul class="wrap datos-utiles" aria-label="Por qué elegirnos">
    ${h.datos.map((d) => `<li>${icono(d.icono)}<span>${esc(completar(d.texto, n))}</span></li>`).join('')}
  </ul>`;

  // ---------- Pulido ----------
  const p = n.pulido;
  const pulido = `
  <section class="section" id="pulido" data-reveal>
    <div class="wrap pulido-grid">
      <div class="pulido-copy">
        <p class="eyebrow">Pulido y corrección</p>
        ${titulo(p.titulo, p.tituloDestacado)}
        <p class="lead">${esc(p.texto)}</p>
        <div class="etapas" role="group" aria-label="Etapas del pulido">
          ${p.etapas.map((e, i) => `<button type="button" class="etapa" data-etapa="${i}" aria-pressed="${i === 0}"><span class="dato">0${i + 1}</span>${esc(e.nombre)}</button>`).join('')}
        </div>
        <p class="etapa-texto" id="etapa-texto" aria-live="polite">${esc(p.etapas[0].texto)}</p>
        <a class="link-flecha" href="#cotizador" data-preset="pulido">Ver precio del pulido <span aria-hidden="true">→</span></a>
      </div>
      <figure class="inspeccion" id="inspeccion" data-etapa="0">
        ${foto('pintura-antes', 'Pintura oscura con micro rayas bajo una luz directa', { sizes: '(min-width: 900px) 55vw, 100vw', clase: 'insp-antes' })}
        ${foto('pintura-despues', 'Pintura oscura pulida, con el reflejo uniforme', { sizes: '(min-width: 900px) 55vw, 100vw', clase: 'insp-despues' })}
        <div class="insp-rayas" aria-hidden="true"></div>
        <div class="insp-luz" aria-hidden="true"></div>
        <figcaption class="nota-ilustrativa">Imagen ilustrativa</figcaption>
      </figure>
    </div>
  </section>`;

  // ---------- Cerámico ----------
  const c = n.ceramico;
  const gotas = (clase) => `<div class="gotas ${clase}" aria-hidden="true"></div>`;
  const ceramico = `
  <section class="claro section" id="ceramico" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Tratamiento cerámico', t: c.titulo, d: c.tituloDestacado, texto: c.texto })}
      <figure class="comparador agua" id="agua" style="--split:50%">
        <div class="capa capa-izq">${foto('pintura-antes', 'Panel oscuro sin tratamiento, el agua queda extendida', { sizes: '(min-width: 1200px) 1200px, 100vw' })}${gotas('gotas-sin')}</div>
        <div class="capa capa-der">${foto('agua-perlas', 'Panel con cerámico, el agua forma gotas en perla', { sizes: '(min-width: 1200px) 1200px, 100vw' })}${gotas('gotas-con')}</div>
        <div class="comp-divisor" aria-hidden="true"><span class="comp-manija">${icono('flechas')}</span></div>
        <div class="comp-etiquetas" aria-hidden="true"><span>Sin tratamiento</span><span>Con cerámico</span></div>
        <input class="comp-range" type="range" min="0" max="100" value="50" aria-label="Mover el divisor entre sin tratamiento y con cerámico">
        <figcaption class="nota-ilustrativa">Imagen ilustrativa</figcaption>
      </figure>
      <div class="agua-controles">
        <button type="button" class="btn btn-acid solo-js" id="rociar">${icono('gota')} Rociar agua</button>
        <p class="agua-ayuda">Arrastrá la línea para comparar las dos mitades.</p>
      </div>
      <ul class="agua-datos">
        ${c.datos.map((d) => `<li><strong>${esc(completar(d.titulo, c, n))}</strong><span>${esc(d.texto)}</span></li>`).join('')}
      </ul>
    </div>
  </section>`;

  // ---------- Servicios ----------
  const servicios = `
  <section class="section" id="servicios" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Servicios', t: 'Lo que le hacemos a tu', d: 'auto.', texto: 'Precios desde, para un auto chico. El valor final depende del tamaño y del estado de la pintura.' })}
      <div class="bento" role="list">
        ${n.servicios
          .map(
            (s) => `
        <article class="servicio${s.destacado ? ' servicio-grande' : ''}" role="listitem">
          <div class="servicio-foto">${foto(s.foto, s.fotoAlt, { sizes: s.destacado ? '(min-width: 900px) 60vw, 85vw' : '(min-width: 900px) 30vw, 85vw', pendiente: s.fotoPendiente })}</div>
          <div class="servicio-cuerpo">
            <h3>${esc(s.nombre)}</h3>
            <ul class="lista-check">${s.incluye.map((i) => `<li>${icono('check')}${esc(i)}</li>`).join('')}</ul>
            <div class="servicio-pie">
              <p class="servicio-datos"><span class="servicio-tiempo">${icono('reloj')} ${esc(s.tiempo)} en el taller</span><span class="servicio-precio">Desde <strong>${pesos(s.precio)}</strong></span></p>
              <a class="btn btn-borde btn-chico" href="${wa(completar(n.mensajes.consultaServicio, { servicio: s.nombre.toLowerCase() }, n))}" target="_blank" rel="noopener">Consultar</a>
            </div>
          </div>
        </article>`,
          )
          .join('')}
      </div>
    </div>
  </section>`;

  // ---------- Paquetes ----------
  const paquetes = `
  <section class="section section-sin-borde" id="precios" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Paquetes', t: 'Elegí cuánto lo querés', d: 'cuidar.' })}
      <div class="paquetes">
        ${n.paquetes
          .map(
            (pk) => `
        <article class="paquete${pk.masElegido ? ' paquete-destacado' : ''}">
          ${pk.masElegido ? '<p class="paquete-badge">El más elegido</p>' : ''}
          <h3>${esc(pk.nombre)}</h3>
          <p class="paquete-resumen">${esc(pk.resumen)}</p>
          <p class="paquete-precio"><span>Desde</span> <strong>${pesos(pk.precio)}</strong></p>
          <ul class="lista-check">${pk.incluye.map((i) => `<li${i.endsWith('+') ? ' class="hereda"' : ''}>${i.endsWith('+') ? '' : icono('check')}${esc(i)}</li>`).join('')}</ul>
          <a class="btn ${pk.masElegido ? 'btn-acid' : 'btn-borde'} btn-full" href="#cotizador" data-preset="${pk.id}">Elegir este paquete</a>
        </article>`,
          )
          .join('')}
      </div>
      <p class="nota">${esc(n.paquetesNota)}</p>
    </div>
  </section>`;

  // ---------- Antes/después + trabajos ----------
  const categorias = [
    ['todos', 'Todos'],
    ['pulido', 'Pulido'],
    ['ceramico', 'Cerámico'],
    ['interior', 'Interior'],
  ];
  const trabajos = `
  <section class="section" id="trabajos" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Antes y después', t: 'La diferencia está en el', d: 'reflejo.', texto: 'Arrastrá la línea, o usá las flechas del teclado, para comparar el mismo panel antes y después del pulido.' })}
      <figure class="comparador antes-despues" id="comparador" style="--split:50%">
        <div class="capa capa-izq">${foto('pintura-antes', 'Antes: pintura oscura con micro rayas', { sizes: '(min-width: 1200px) 1200px, 100vw', clase: 'img-antes' })}</div>
        <div class="capa capa-der">${foto('pintura-despues', 'Después: pintura pulida con el reflejo uniforme', { sizes: '(min-width: 1200px) 1200px, 100vw' })}</div>
        <div class="comp-divisor" aria-hidden="true"><span class="comp-manija">${icono('flechas')}</span></div>
        <div class="comp-etiquetas" aria-hidden="true"><span>Antes</span><span>Después</span></div>
        <input class="comp-range" type="range" min="0" max="100" value="50" aria-label="Comparar antes y después">
        <figcaption class="nota-ilustrativa">Imagen ilustrativa</figcaption>
      </figure>

      <div class="trabajos-head">
        <h3 class="subtitulo">Trabajos recientes</h3>
        <div class="chips-filtro solo-js" role="group" aria-label="Filtrar trabajos">
          ${categorias.map(([id, nom], i) => `<button type="button" class="chip" data-filtro="${id}" aria-pressed="${i === 0}">${nom}</button>`).join('')}
        </div>
      </div>
      <ul class="trabajos" id="trabajos-grilla">
        ${n.trabajos
          .map(
            (t, i) => `
        <li data-cat="${esc(t.categoria)}">
          <button type="button" class="trabajo" data-indice="${i}" aria-label="Ver ${esc(t.auto)}, ${esc(t.servicio)}">
            ${foto(t.foto, `${t.auto} · ${t.servicio}`, { sizes: '(min-width: 900px) 33vw, 50vw', pendiente: t.fotoPendiente })}
            <span class="trabajo-pie"><strong>${esc(t.auto)}</strong><span>${esc(t.servicio)}</span></span>
          </button>
        </li>`,
          )
          .join('')}
      </ul>
      <a class="btn btn-borde" href="${esc(n.instagram.url)}" target="_blank" rel="noopener">${icono('instagram')} Ver más en Instagram</a>
    </div>
    <dialog class="visor" id="visor" aria-labelledby="visor-titulo">
      <div class="visor-media" id="visor-media"></div>
      <p class="visor-pie" id="visor-titulo"></p>
      <button type="button" class="icon-btn visor-cerrar" aria-label="Cerrar">${icono('cerrar')}</button>
    </dialog>
  </section>`;

  // ---------- Proceso ----------
  const proceso = `
  <section class="section" id="proceso" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Cómo trabajamos', t: 'Cinco pasos, sin', d: 'sorpresas.' })}
      <div class="proceso" id="proceso-linea">
        <div class="proceso-riel" aria-hidden="true"><i class="proceso-fill"></i></div>
        <ol class="pasos">
          ${n.proceso
            .map(
              (s, i) => `
          <li class="paso">
            <span class="paso-marca" aria-hidden="true">${i + 1}</span>
            <div class="paso-texto"><h3><span class="visually-hidden">Paso ${i + 1}: </span>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>
            <div class="paso-foto">${foto(s.foto, s.fotoPendiente, { sizes: '(min-width: 900px) 240px, 90vw', pendiente: s.fotoPendiente })}</div>
          </li>`,
            )
            .join('')}
        </ol>
      </div>
    </div>
  </section>`;

  // ---------- Cotizador ----------
  const cot = n.cotizador;
  const def = cot.porDefecto;
  const inicial = calcular(n, { tamano: def.tamano, principal: def.principal, estado: def.estado, extras: [] });
  const siluetas = {
    chico: '<path d="M10 38v-8q2-5 10-6l16-2 12-10q4-3 10-3h20q6 0 10 6l8 10q8 1 10 5v8"/><path d="M41 38h41"/><circle cx="32" cy="38" r="7"/><circle cx="90" cy="38" r="7"/>',
    mediano: '<path d="M4 38v-8q2-5 12-6l18-2 12-10q4-3 10-3h20q6 0 10 5l8 8 16 2q6 2 6 6v8"/><path d="M36 38h52"/><circle cx="28" cy="38" r="7"/><circle cx="96" cy="38" r="7"/>',
    suv: '<path d="M6 38V24q1-5 8-6l16-1 10-11q2-2 8-2h46q6 0 8 5l6 10q6 1 6 6v13"/><path d="M38 38h48"/><circle cx="29" cy="38" r="8"/><circle cx="95" cy="38" r="8"/>',
    grande: '<path d="M4 38V14q0-8 8-8h74q6 0 10 6l10 10q8 1 8 6v10"/><path d="M33 38h53"/><circle cx="25" cy="38" r="8"/><circle cx="94" cy="38" r="8"/>',
  };
  const opcionPrincipal = (o, checked) =>
    `<label class="opcion-chip"><input type="radio" name="principal" value="${o.id}"${checked ? ' checked' : ''}><span>${esc(o.nombre)}</span></label>`;
  const cotizador = `
  <section class="section" id="cotizador" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Presupuesto', t: 'Calculá cuánto', d: 'sale.', texto: 'Elegí tu auto y lo que querés hacerle. El precio se actualiza al instante y lo mandás por WhatsApp.' })}
      <form class="cotizador" id="cotizador-form" novalidate>
        <div class="cot-pasos">
          <fieldset class="grupo">
            <legend><span class="grupo-num">1</span>Tamaño del vehículo</legend>
            <div class="opciones-tamano">
              ${cot.tamanos
                .map(
                  (t) => `<label class="opcion-card"><input type="radio" name="tamano" value="${t.id}"${t.id === def.tamano ? ' checked' : ''}><svg viewBox="0 0 124 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${siluetas[t.id] ?? siluetas.mediano}</svg><strong>${esc(t.nombre)}</strong><small>${esc(t.ejemplo)}</small></label>`,
                )
                .join('')}
            </div>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num">2</span>Paquete o servicio principal</legend>
            <div class="opciones-paquete">
              ${n.paquetes
                .map(
                  (pk) => `<label class="opcion-card opcion-paquete"><input type="radio" name="principal" value="${pk.id}"${pk.id === def.principal ? ' checked' : ''}><strong>${esc(pk.nombre)}</strong><small>Desde ${pesos(pk.precio)}</small>${pk.masElegido ? '<em class="mini-badge">El más elegido</em>' : ''}</label>`,
                )
                .join('')}
            </div>
            <p class="grupo-sub">O un servicio suelto</p>
            <div class="chips">${n.servicios.map((s) => opcionPrincipal(s, s.id === def.principal)).join('')}</div>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num">3</span>Estado de la pintura</legend>
            <input class="estado-range" id="estado" name="estado" type="range" min="0" max="${cot.estados.length - 1}" step="1" value="${def.estado}" aria-valuetext="${esc(cot.estados[def.estado].nombre)}" aria-describedby="estado-nota">
            <div class="estado-marcas" aria-hidden="true">${cot.estados.map((e, i) => `<span data-estado="${i}">${esc(e.nombre)}<small>+${Math.round(e.recargo * 100)} %</small></span>`).join('')}</div>
            <p class="grupo-sub" id="estado-nota">${inicial.aplicaEstado ? 'Cuanto más marcas, más trabajo de pulido.' : 'No cambia el precio de este servicio.'}</p>
          </fieldset>
          <fieldset class="grupo">
            <legend><span class="grupo-num">4</span>Extras</legend>
            <div class="chips">${cot.extras.map((e) => `<label class="opcion-chip"><input type="checkbox" name="extras" value="${e.id}"><span>${esc(e.nombre)} <small>+${pesos(e.precio)}</small></span></label>`).join('')}</div>
          </fieldset>
        </div>
        <aside class="cot-resumen" id="cot-resumen" aria-labelledby="resumen-titulo">
          <h3 id="resumen-titulo">Tu presupuesto</h3>
          <p class="cot-total-label">Precio estimado</p>
          <p class="cot-total"><output id="cot-total" aria-live="polite">${pesos(inicial.total)}</output></p>
          <dl class="cot-desglose" id="cot-desglose">${inicial.desglose.map((d) => `<div><dt>${esc(d.concepto)}</dt><dd>${pesos(d.monto)}</dd></div>`).join('')}</dl>
          <p class="cot-tiempo">${icono('reloj')} Tiempo en el taller: <strong id="cot-tiempo">${esc(inicial.tiempo)}</strong></p>
          <div class="campo">
            <label for="cot-nombre">Tu nombre <span class="opcional">(opcional)</span></label>
            <input id="cot-nombre" name="nombre" type="text" autocomplete="given-name" maxlength="40">
          </div>
          <button class="btn btn-acid btn-full" type="submit">${icono('whatsapp')} Enviar presupuesto por WhatsApp</button>
          <p class="nota">${esc(cot.nota)}</p>
        </aside>
      </form>
    </div>
  </section>`;

  // ---------- Opiniones ----------
  const rating = String(n.googleRating ?? '').trim();
  const opiniones = `
  <section class="section claro-suave" id="opiniones" data-reveal>
    <div class="wrap">
      ${cabecera({ eyebrow: 'Opiniones', t: 'Lo que dicen nuestros', d: 'clientes.' })}
      ${rating ? `<p class="google-rating">${icono('estrella')} <strong>${esc(rating)}</strong> en Google</p>` : ''}
      <ul class="opiniones">
        ${n.opiniones
          .map(
            (o) => `
        <li class="opinion">
          <p class="estrellas" aria-label="${o.estrellas} de 5 estrellas">${Array.from({ length: 5 }, (_, i) => `<span class="${i < o.estrellas ? 'on' : ''}">${icono('estrella')}</span>`).join('')}</p>
          <blockquote>${esc(o.texto)}</blockquote>
          <p class="opinion-autor"><strong>${esc(o.nombre)}</strong><span>${esc(o.auto)}</span></p>
        </li>`,
          )
          .join('')}
      </ul>
      <p class="nota">${esc(n.opinionesNota)}</p>
    </div>
  </section>`;

  // ---------- Contacto + preguntas ----------
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${n.mapa.lat},${n.mapa.lng}`;
  const contacto = `
  <section class="section" id="contacto" data-reveal>
    <div class="wrap contacto-grid">
      <div class="turno">
        <p class="eyebrow">Turnos</p>
        ${titulo('Pedí tu', 'turno.')}
        <p class="lead">Completá tus datos y te abrimos WhatsApp con el mensaje listo. Te respondemos con día y hora.</p>
        <form class="turno-form" id="turno-form" novalidate>
          <div class="campo">
            <label for="t-nombre">Nombre</label>
            <input id="t-nombre" name="nombre" type="text" autocomplete="name" required aria-describedby="t-nombre-error" data-error="Poné tu nombre así sabemos a quién responder.">
            <p class="error" id="t-nombre-error"></p>
          </div>
          <div class="campo">
            <label for="t-telefono">Teléfono</label>
            <input id="t-telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="t-telefono-error" data-error="Poné un teléfono para que te podamos responder." data-error-formato="Revisá el teléfono: tiene que tener al menos 8 números.">
            <p class="error" id="t-telefono-error"></p>
          </div>
          <div class="campo campo-full">
            <label for="t-auto">Auto <span class="opcional">(marca, modelo y año)</span></label>
            <input id="t-auto" name="auto" type="text" placeholder="Ej.: VW Amarok 2019" aria-describedby="t-auto-error">
            <p class="error" id="t-auto-error"></p>
          </div>
          <div class="campo">
            <label for="t-servicio">Servicio</label>
            <select id="t-servicio" name="servicio" required aria-describedby="t-servicio-error" data-error="Elegí qué le querés hacer al auto.">
              <option value="">Elegí un servicio</option>
              <optgroup label="Paquetes">${n.paquetes.map((pk) => `<option>Paquete ${esc(pk.nombre)}</option>`).join('')}</optgroup>
              <optgroup label="Servicios">${n.servicios.map((s) => `<option>${esc(s.nombre)}</option>`).join('')}</optgroup>
              <option>Todavía no sé, quiero que lo revisen</option>
            </select>
            <p class="error" id="t-servicio-error"></p>
          </div>
          <div class="campo">
            <label for="t-dia">Día preferido</label>
            <select id="t-dia" name="dia">
              <option value="">Cualquier día</option>
              ${dias.map((d) => `<option>${d}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-acid btn-full campo-full" type="submit">${icono('whatsapp')} Pedir turno por WhatsApp</button>
        </form>
      </div>
      <div class="donde">
        <div class="mapa" id="mapa" data-lat="${n.mapa.lat}" data-lng="${n.mapa.lng}" data-zoom="${n.mapa.zoom}" data-nombre="${esc(n.nombre)}">
          <a class="mapa-fallback" href="${esc(comoLlegar)}" target="_blank" rel="noopener">${icono('pin')} Ver ${esc(n.direccionCorta)} en el mapa</a>
        </div>
        <dl class="datos-contacto">
          <div><dt>${icono('pin')} Dirección</dt><dd>${esc(n.direccion)}</dd></div>
          <div><dt>${icono('reloj')} Horario</dt><dd>${n.horario.map((x) => `${esc(x.dias)}: ${esc(x.horas)}`).join('<br>')}</dd></div>
          <div><dt>${icono('whatsapp')} WhatsApp</dt><dd><a href="${waTurno}" target="_blank" rel="noopener">${esc(n.telefonoVisible)}</a></dd></div>
          <div><dt>${icono('instagram')} Instagram</dt><dd><a href="${esc(n.instagram.url)}" target="_blank" rel="noopener">${esc(n.instagram.usuario)}</a></dd></div>
        </dl>
        <div class="botones">
          <a class="btn btn-borde" href="${esc(comoLlegar)}" target="_blank" rel="noopener">${icono('ruta')} Cómo llegar</a>
          <a class="btn btn-acid" href="${waTurno}" target="_blank" rel="noopener">${icono('whatsapp')} WhatsApp</a>
        </div>
      </div>
    </div>
    <div class="wrap faq" id="preguntas">
      <div class="faq-head"><p class="eyebrow">Preguntas</p>${titulo('Preguntas', 'frecuentes.')}</div>
      <div class="faq-lista">
        ${n.preguntas.map((q) => `<details><summary>${esc(q.pregunta)}<span class="faq-icono" aria-hidden="true"></span></summary><p>${esc(q.respuesta)}</p></details>`).join('')}
      </div>
    </div>
  </section>`;

  const footer = `
  <footer class="footer">
    <div class="wrap footer-grid">
      <div>${marca}<p class="footer-lema">${esc(n.lema)}</p></div>
      <div><p class="footer-tit">Horario</p><p>${n.horario.map((x) => `${esc(x.dias)}: ${esc(x.horas)}`).join('<br>')}</p></div>
      <div><p class="footer-tit">Contacto</p><p><a href="${waTurno}" target="_blank" rel="noopener">WhatsApp ${esc(n.telefonoVisible)}</a><br><a href="${esc(n.instagram.url)}" target="_blank" rel="noopener">Instagram ${esc(n.instagram.usuario)}</a><br>${esc(n.direccion)}</p></div>
    </div>
    <p class="wrap footer-demo">${esc(n.avisoDemo)} · © <span id="anio">${new Date().getFullYear()}</span></p>
  </footer>
  <div class="barra-movil" id="barra-movil">
    <a class="btn btn-borde" href="#cotizador">${icono('calculadora')} Presupuesto</a>
    <a class="btn btn-acid" href="${waTurno}" target="_blank" rel="noopener">${icono('whatsapp')} WhatsApp</a>
  </div>
  <div class="barra-cotizador" id="barra-cotizador">
    <p><span>Precio estimado</span><output id="barra-total">${pesos(inicial.total)}</output></p>
    <button type="submit" form="cotizador-form" class="btn btn-acid">${icono('whatsapp')} Enviar</button>
  </div>`;

  const cuerpo = `${header}<main id="contenido">${hero}${pulido}${ceramico}${servicios}${paquetes}${trabajos}${proceso}${cotizador}${opiniones}${contacto}</main>${footer}`;

  return html
    .replace('<!--@pagina-->', cuerpo)
    .replace(/\{\{(\w+)\}\}/g, (m, k) => esc(n[k] ?? m));
}

// Exportado para el cliente: lista de opciones del cotizador (paquetes + servicios).
export { opcionesPrincipales };
