// SEO y secciones: título y descripción para Google, imagen para compartir, favicon, redes,
// textos alternativos de todas las fotos y qué secciones se ven en la web.
import { Cabecera, Tarjeta, Texto, Fila, CampoImagen, Interruptor, BarraGuardar, useEditor, IconoBoton, Boton } from '../ui.jsx';
import { SECCIONES } from '../../js/contenido.js';
import { urlFoto } from '../imagenes.js';

// Todas las fotos con texto alternativo editable: [etiqueta, ruta para leer/escribir].
function fotosConAlt(v) {
  const lista = [];
  const add = (etiqueta, obj, set, foto, campoAlt = 'fotoAlt') => foto && lista.push({ etiqueta, foto, alt: obj[campoAlt] ?? '', set: (val) => set({ ...obj, [campoAlt]: val }) });
  add('Inicio', v.hero, (o) => v.__set('hero', o), v.hero.foto);
  add('Manifiesto', v.manifiesto, (o) => v.__set('manifiesto', o), v.manifiesto.foto);
  v.servicios.forEach((s, i) => add(`Servicio: ${s.nombre}`, s, (o) => v.__set('servicios', v.servicios.map((x, j) => (j === i ? o : x))), s.foto));
  v.trabajos.forEach((t, i) => add(`Trabajo: ${t.auto}`, t, (o) => v.__set('trabajos', v.trabajos.map((x, j) => (j === i ? o : x))), t.foto));
  v.resultados.forEach((r, i) => add(`Antes/después: ${r.nombre}`, r, (o) => v.__set('resultados', v.resultados.map((x, j) => (j === i ? o : x))), r.despues, 'alt'));
  v.proceso.forEach((p, i) => add(`Proceso: ${p.titulo}`, p, (o) => v.__set('proceso', v.proceso.map((x, j) => (j === i ? o : x))), p.foto));
  v.promociones.forEach((p, i) => add(`Promoción: ${p.titulo}`, p, (o) => v.__set('promociones', v.promociones.map((x, j) => (j === i ? o : x))), p.foto));
  return lista;
}

export function Seo() {
  const ed = useEditor(['seo', 'redes', 'secciones', 'hero', 'manifiesto', 'servicios', 'trabajos', 'resultados', 'proceso', 'promociones', 'nombre', 'ciudad', 'descripcion']);
  const v = { ...ed.valor, __set: ed.set };
  const setSeo = (k, x) => ed.set('seo', (o) => ({ ...o, [k]: x }));
  const titulo = v.seo.titulo || `${v.nombre}${v.ciudad ? ` · ${v.ciudad}` : ''}`;
  const desc = v.seo.descripcion || v.descripcion;
  const fotos = fotosConAlt(v);
  const sinAlt = fotos.filter((f) => !f.alt.trim()).length;

  const validar = () => {
    for (const r of v.redes) if (!/^https:\/\/\S+/.test(r.url)) return `El link de “${r.nombre || 'la red'}” tiene que empezar con https://`;
    return '';
  };

  return (
    <>
      <Cabecera titulo="SEO y secciones" descripcion="Cómo aparece la web en Google y al compartirla, y qué partes se muestran." />
      <div class="grilla-form">
        <Tarjeta titulo="Google" descripcion="Si dejás los campos vacíos, se usan el nombre y la descripción del negocio.">
          <Texto etiqueta="Título" valor={v.seo.titulo} onCambio={(x) => setSeo('titulo', x)} max={60} placeholder={titulo} />
          <Texto etiqueta="Meta descripción" valor={v.seo.descripcion} onCambio={(x) => setSeo('descripcion', x)} multilinea filas={3} max={160} placeholder={v.descripcion} />
          <div class="serp" aria-label="Así se vería en Google">
            <span class="serp-url">{location.host}</span>
            <span class="serp-titulo">{titulo}</span>
            <span class="serp-desc">{desc}</span>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Imagen y favicon">
          <Fila>
            <CampoImagen etiqueta="Imagen para compartir" valor={v.seo.imagen} onCambio={(x) => setSeo('imagen', x)} carpeta="seo" formato="image/jpeg" ayuda="1200 × 630 px ideal. La ven WhatsApp, Facebook, etc. Si no hay, se usa la foto del inicio." />
            <CampoImagen etiqueta="Favicon" valor={v.seo.favicon} onCambio={(x) => setSeo('favicon', x)} icono ayuda="Cuadrado, PNG o SVG. El ícono de la pestaña." />
          </Fila>
        </Tarjeta>

        <Tarjeta titulo="Redes sociales" descripcion="Aparecen en el footer, además de Instagram (que se edita en Datos del negocio).">
          {v.redes.map((r, i) => (
            <div class="fila fila-datos" key={i}>
              <Texto etiqueta="Nombre" valor={r.nombre} onCambio={(x) => ed.set('redes', v.redes.map((y, j) => (j === i ? { ...y, nombre: x } : y)))} placeholder="Facebook" max={24} />
              <Texto etiqueta="Link" valor={r.url} onCambio={(x) => ed.set('redes', v.redes.map((y, j) => (j === i ? { ...y, url: x } : y)))} placeholder="https://…" />
              <IconoBoton icono="basura" etiqueta="Quitar" onClick={() => ed.set('redes', v.redes.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Boton chico icono="mas" onClick={() => ed.set('redes', [...v.redes, { nombre: '', url: 'https://' }])}>Agregar red</Boton>
        </Tarjeta>

        <Tarjeta titulo="Secciones visibles" descripcion="Apagá una sección para sacarla de la web (y del menú). No se borra nada.">
          <div class="lista-interruptores">
            {SECCIONES.map(([k, nombre]) => (
              <Interruptor key={k} etiqueta={nombre} valor={v.secciones[k].visible} onCambio={(x) => ed.set('secciones', (s) => ({ ...s, [k]: { ...s[k], visible: x } }))} />
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Textos alternativos" descripcion={sinAlt ? `${sinAlt} foto${sinAlt > 1 ? 's' : ''} sin descripción. Describí lo que se ve: ayuda a Google y a personas con lectores de pantalla.` : 'Todas las fotos tienen descripción.'} class="col-2">
          <ul class="alts">
            {fotos.map((f, i) => (
              <li key={i}>
                <img src={urlFoto(f.foto)} alt="" loading="lazy" />
                <Texto etiqueta={f.etiqueta} valor={f.alt} onCambio={f.set} max={160} error={!f.alt.trim() ? 'Falta la descripción.' : undefined} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
      <BarraGuardar editor={ed} validar={validar} />
    </>
  );
}
