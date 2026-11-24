// Modelo del contenido de la web (el "documento" que edita el panel y lee la página).
// Lo usan: el render de la página (build y servidor), el navegador, la API y el panel.
//
// normalizar(doc) completa lo que falte con valores seguros, para que un documento viejo
// o a medio editar nunca rompa la página. No inventa contenido: lo que falta queda vacío.

export const VERSION_CONTENIDO = 5;

export const SECCIONES = [
  // clave, nombre en el panel, ¿lleva número en la etiqueta "01 · …"?
  ['manifiesto', 'Manifiesto', false],
  ['pulido', 'Pulido (luz de inspección)', true],
  ['ceramico', 'Cerámico (agua)', true],
  ['servicios', 'Servicios', true],
  ['promociones', 'Promociones', true],
  ['resultados', 'Antes y después', true],
  ['trabajos', 'Trabajos recientes', false],
  ['proceso', 'Proceso', true],
  ['cotizador', 'Cotizador', true],
  ['opiniones', 'Opiniones', true],
  ['contacto', 'Contacto', true],
  ['preguntas', 'Preguntas frecuentes', false],
  ['mapa', 'Mapa', false],
];

export const SECCIONES_POR_DEFECTO = {
  manifiesto: { visible: true },
  pulido: { visible: true },
  ceramico: { visible: true },
  servicios: { visible: true, titulo: ['Todo lo que tu auto', 'se merece.'], texto: 'Precios desde, para un auto chico. El valor final depende del tamaño y del estado de la pintura.' },
  promociones: { visible: true, titulo: ['Promociones', 'por tiempo limitado.'], texto: '' },
  resultados: { visible: true, titulo: ['De cansado', 'a terminado.'], texto: 'Arrastrá la línea, o usá las flechas del teclado, para comparar el antes y el después.' },
  trabajos: { visible: true, titulo: 'Trabajos recientes', maximo: 6 },
  proceso: { visible: true, titulo: ['Cinco pasos.', 'Cero sorpresas.'] },
  cotizador: { visible: true, titulo: ['Armalo.', 'Mirá el precio.'], texto: 'Elegí tu auto y lo que querés hacerle. El precio cambia al instante y lo mandás por WhatsApp.' },
  opiniones: { visible: true, titulo: ['Te lo devolvemos', 'impecable.'] },
  contacto: { visible: true, titulo: ['Vení a', 'conocernos.'], texto: '' },
  preguntas: { visible: true, titulo: 'Preguntas frecuentes' },
  mapa: { visible: true },
};

export const SILUETAS_DISPONIBLES = [
  ['chico', 'Auto chico'],
  ['mediano', 'Sedán'],
  ['suv', 'SUV / camioneta'],
  ['grande', 'Utilitario'],
];

export const CATEGORIAS_TRABAJO = [
  ['pintura', 'Pintura'],
  ['ceramico', 'Cerámico'],
  ['interior', 'Interior'],
  ['lavado', 'Lavado'],
  ['llantas', 'Llantas y motor'],
  ['opticas', 'Ópticas'],
  ['otro', 'Otro'],
];

const arr = (v) => (Array.isArray(v) ? v : []);
const txt = (v, d = '') => (v == null ? d : String(v));
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const bool = (v, d = true) => (typeof v === 'boolean' ? v : d);
const lineas = (v, d = ['', '']) => {
  if (Array.isArray(v)) return [txt(v[0]), txt(v[1])];
  if (typeof v === 'string') return [v, ''];
  return [...d];
};

export const slug = (s) =>
  txt(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'item';

export const nuevoId = (prefijo = 'id') => `${prefijo}-${Math.random().toString(36).slice(2, 8)}`;

// Asegura ids únicos dentro de una lista (los ids conectan el cotizador con los presets de la página).
function conIds(lista, base) {
  const usados = new Set();
  return lista.map((item, i) => {
    let id = slug(item.id || item[base] || `${i + 1}`);
    while (usados.has(id)) id = `${id}-${i + 1}`;
    usados.add(id);
    return { ...item, id };
  });
}

// Una foto es una clave local ("servicios/opticas", convertida en el build)
// o un objeto { src, src800, w, h } subido desde el panel a Supabase Storage.
export function normalizarFoto(f) {
  if (!f) return null;
  if (typeof f === 'string') return f.trim() || null;
  if (typeof f === 'object' && f.src) return { src: txt(f.src), src800: txt(f.src800 || f.src), w: num(f.w, 1600), h: num(f.h, 1000) };
  return null;
}

export function normalizar(entrada = {}) {
  const d = typeof entrada === 'object' && entrada ? entrada : {};
  const secciones = {};
  for (const [clave] of SECCIONES) {
    const def = SECCIONES_POR_DEFECTO[clave];
    const s = d.secciones?.[clave] ?? {};
    secciones[clave] = { ...def, ...s, visible: bool(s.visible, def.visible) };
    if (Array.isArray(def.titulo)) secciones[clave].titulo = lineas(s.titulo ?? (clave === 'contacto' ? d.contacto?.titulo : null), def.titulo);
  }

  const servicios = conIds(arr(d.servicios), 'nombre').map((s) => ({
    id: s.id,
    nombre: txt(s.nombre),
    linea: txt(s.linea),
    tiempo: txt(s.tiempo),
    precio: num(s.precio),                                  // precio de referencia de la tarjeta ("Desde")
    precioCotizador: num(s.precioCotizador, num(s.precio)), // base del cálculo como "servicio suelto"
    enCotizador: bool(s.enCotizador, true),
    dias: num(s.dias),
    pintura: bool(s.pintura, false),
    foto: normalizarFoto(s.foto),
    fotoAlt: txt(s.fotoAlt),
    destacado: bool(s.destacado, false),
    activo: bool(s.activo, true),
  }));

  const paquetes = conIds(arr(d.paquetes), 'nombre').map((p) => ({
    id: p.id,
    nombre: txt(p.nombre),
    precio: num(p.precio),
    dias: num(p.dias),
    pintura: bool(p.pintura, false),
    incluye: arr(p.incluye).map((x) => txt(x)).filter(Boolean),
    activo: bool(p.activo, true),
  }));

  const c = d.cotizador ?? {};
  const cotizador = {
    tamanos: conIds(arr(c.tamanos), 'nombre').map((t) => ({
      id: t.id,
      nombre: txt(t.nombre),
      ejemplo: txt(t.ejemplo),
      multiplicador: num(t.multiplicador, 1),
      silueta: SILUETAS_DISPONIBLES.some(([k]) => k === (t.silueta || t.id)) ? t.silueta || t.id : 'mediano',
      activo: bool(t.activo, true),
    })),
    estados: arr(c.estados).map((e, i) => ({
      id: slug(e.id || e.nombre || `estado-${i + 1}`),
      nombre: txt(e.nombre),
      recargo: num(e.recargo),
      diasExtra: num(e.diasExtra),
    })),
    extras: conIds(arr(c.extras), 'nombre').map((e) => ({
      id: e.id,
      nombre: txt(e.nombre),
      precio: num(e.precio),
      dias: num(e.dias),
      activo: bool(e.activo, true),
    })),
    redondeo: Math.max(1, num(c.redondeo, 1000)),
    nota: txt(c.nota),
    condiciones: txt(c.condiciones),
    privacidad: txt(c.privacidad, 'Guardamos lo que elegiste, tu nombre y tu teléfono (si los dejás) solo para responderte. No los compartimos.'),
    porDefecto: { tamano: txt(c.porDefecto?.tamano), principal: txt(c.porDefecto?.principal), estado: num(c.porDefecto?.estado, 0) },
  };
  if (!cotizador.estados.length) cotizador.estados = [{ id: 'normal', nombre: 'Normal', recargo: 0, diasExtra: 0 }];

  // Valores por defecto que apuntan a algo activo (si se desactivó, se elige el primero disponible).
  const tamanosActivos = cotizador.tamanos.filter((t) => t.activo);
  if (!tamanosActivos.some((t) => t.id === cotizador.porDefecto.tamano)) cotizador.porDefecto.tamano = tamanosActivos[0]?.id ?? '';
  const principales = [...paquetes.filter((p) => p.activo), ...servicios.filter((s) => s.activo && s.enCotizador)];
  if (!principales.some((p) => p.id === cotizador.porDefecto.principal)) cotizador.porDefecto.principal = principales[0]?.id ?? '';
  cotizador.porDefecto.estado = Math.min(Math.max(0, Math.round(cotizador.porDefecto.estado)), cotizador.estados.length - 1);

  const h = d.hero ?? {};
  const botones = arr(h.botones).length
    ? arr(h.botones).slice(0, 2).map((b) => ({ texto: txt(b.texto), enlace: txt(b.enlace, '#cotizador') }))
    : [{ texto: 'Calcular mi presupuesto', enlace: '#cotizador' }, { texto: 'Ver resultados', enlace: '#resultados' }];

  const demo = d.demo ?? { activo: Boolean(d.avisoDemo), aviso: txt(d.avisoDemo) };

  return {
    version: VERSION_CONTENIDO,
    demo: { activo: bool(demo.activo, false), aviso: txt(demo.aviso) },
    nombre: txt(d.nombre, 'Mi local'),
    nombreCorto: txt(d.nombreCorto || d.nombre, 'Local'),
    descripcion: txt(d.descripcion),
    ciudad: txt(d.ciudad),
    region: txt(d.region),
    lema: txt(d.lema),
    whatsapp: txt(d.whatsapp).replace(/[^\dXx]/g, ''),
    telefonoVisible: txt(d.telefonoVisible),
    telefono: txt(d.telefono),
    email: txt(d.email),
    direccion: txt(d.direccion),
    direccionCorta: txt(d.direccionCorta || d.direccion),
    mapsUrl: txt(d.mapsUrl),
    mapa: { lat: num(d.mapa?.lat, -36.8927), lng: num(d.mapa?.lng, -60.3225), zoom: num(d.mapa?.zoom, 15) },
    horario: arr(d.horario).map((x) => ({ dias: txt(x.dias), horas: txt(x.horas) })),
    horarioCorto: txt(d.horarioCorto),
    instagram: { usuario: txt(d.instagram?.usuario), url: txt(d.instagram?.url) },
    redes: arr(d.redes).map((r) => ({ nombre: txt(r.nombre), url: txt(r.url) })).filter((r) => r.url),
    mensajes: {
      cotizacion: txt(d.mensajes?.cotizacion, 'Hola {nombreCorto}, quiero pedir una cotización.'),
      servicio: txt(d.mensajes?.servicio, 'Hola {nombreCorto}, quiero pedir una cotización de {servicio}.'),
    },
    seo: {
      titulo: txt(d.seo?.titulo),
      descripcion: txt(d.seo?.descripcion),
      imagen: normalizarFoto(d.seo?.imagen),
      favicon: normalizarFoto(d.seo?.favicon),
    },
    secciones,
    hero: {
      titulo: lineas(h.titulo),
      bajada: txt(h.bajada),
      foto: normalizarFoto(h.foto),
      fotoAlt: txt(h.fotoAlt),
      pista: txt(h.pista, 'Pasá el mouse por el auto para pulirlo'),
      botones,
    },
    manifiesto: {
      frase: lineas(d.manifiesto?.frase),
      foto: normalizarFoto(d.manifiesto?.foto),
      fotoAlt: txt(d.manifiesto?.fotoAlt),
      datos: arr(d.manifiesto?.datos).map((x) => ({ valor: txt(x.valor), texto: txt(x.texto) })),
    },
    pulido: {
      titulo: lineas(d.pulido?.titulo),
      texto: txt(d.pulido?.texto),
      etapas: arr(d.pulido?.etapas).map((e) => ({ nombre: txt(e.nombre), titulo: txt(e.titulo), texto: txt(e.texto), defectos: num(e.defectos) })),
    },
    ceramico: {
      titulo: lineas(d.ceramico?.titulo),
      texto: txt(d.ceramico?.texto),
      modos: {
        con: { angulo: txt(d.ceramico?.modos?.con?.angulo), comportamiento: txt(d.ceramico?.modos?.con?.comportamiento) },
        sin: { angulo: txt(d.ceramico?.modos?.sin?.angulo), comportamiento: txt(d.ceramico?.modos?.sin?.comportamiento) },
      },
      duraciones: arr(d.ceramico?.duraciones).map((x) => ({ anios: txt(x.anios), paquete: txt(x.paquete), texto: txt(x.texto), destacado: bool(x.destacado, false) })),
    },
    servicios,
    paquetes,
    cotizador,
    promociones: conIds(arr(d.promociones), 'titulo').map((p) => ({
      id: p.id,
      titulo: txt(p.titulo),
      descripcion: txt(p.descripcion),
      foto: normalizarFoto(p.foto),
      fotoAlt: txt(p.fotoAlt),
      precio: p.precio === '' || p.precio == null ? null : num(p.precio, null),
      precioAnterior: p.precioAnterior === '' || p.precioAnterior == null ? null : num(p.precioAnterior, null),
      desde: txt(p.desde),
      hasta: txt(p.hasta),
      activa: bool(p.activa, true),
      preset: txt(p.preset),
    })),
    resultados: conIds(arr(d.resultados), 'nombre').map((r) => ({
      id: r.id,
      nombre: txt(r.nombre),
      categoria: txt(r.categoria, 'pintura'),
      antes: normalizarFoto(r.antes),
      despues: normalizarFoto(r.despues),
      alt: txt(r.alt),
      pie: txt(r.pie),
      visible: bool(r.visible, true),
    })),
    trabajos: conIds(arr(d.trabajos), 'auto').map((t) => ({
      id: t.id,
      auto: txt(t.auto),
      servicio: txt(t.servicio),
      descripcion: txt(t.descripcion),
      categoria: txt(t.categoria, 'otro'),
      foto: normalizarFoto(t.foto),
      fotoAlt: txt(t.fotoAlt),
      destacado: bool(t.destacado, false),
      visible: bool(t.visible, true),
      ejemplo: bool(t.ejemplo, false),
    })),
    proceso: conIds(arr(d.proceso), 'titulo').map((s) => ({ id: s.id, titulo: txt(s.titulo), texto: txt(s.texto), foto: normalizarFoto(s.foto), fotoAlt: txt(s.fotoAlt) })),
    opiniones: conIds(arr(d.opiniones), 'nombre').map((o) => ({
      id: o.id,
      nombre: txt(o.nombre),
      auto: txt(o.auto),
      estrellas: Math.min(5, Math.max(1, Math.round(num(o.estrellas, 5)))),
      texto: txt(o.texto),
      foto: normalizarFoto(o.foto),
      visible: bool(o.visible, true),
      ejemplo: bool(o.ejemplo, false),
    })),
    opinionesNota: txt(d.opinionesNota),
    preguntas: conIds(arr(d.preguntas), 'pregunta').map((q) => ({ id: q.id, pregunta: txt(q.pregunta), respuesta: txt(q.respuesta) })),
  };
}

// ¿La promoción está vigente hoy? (fechas en formato AAAA-MM-DD, ambas opcionales, inclusivas)
export function promoVigente(p, hoy = new Date()) {
  if (!p.activa) return false;
  const dia = hoy.toISOString().slice(0, 10);
  if (p.desde && dia < p.desde) return false;
  if (p.hasta && dia > p.hasta) return false;
  return true;
}

// Lo que la página pública necesita en el navegador (cotizador, WhatsApp, efectos, mapa).
export function datosCliente(n) {
  return {
    nombre: n.nombre,
    nombreCorto: n.nombreCorto,
    direccion: n.direccion,
    whatsapp: n.whatsapp,
    mensajes: n.mensajes,
    mapa: n.mapa,
    pulido: { etapas: n.pulido.etapas },
    ceramico: { modos: n.ceramico.modos },
    resultados: n.resultados.filter((r) => r.visible).map((r) => ({ id: r.id, pie: r.pie })),
    servicios: n.servicios,
    paquetes: n.paquetes,
    cotizador: n.cotizador,
  };
}
