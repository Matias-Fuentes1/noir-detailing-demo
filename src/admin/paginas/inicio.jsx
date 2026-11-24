// Inicio: hero (título, bajada, foto, botones) y el manifiesto que va debajo.
import { Cabecera, Tarjeta, Texto, Fila, CampoImagen, Seleccion, BarraGuardar, useEditor, ListaTextos, IconoBoton, Boton, mover } from '../ui.jsx';
import { requerido } from '../lista.jsx';

export const DESTINOS = [
  ['#cotizador', 'Cotizador'],
  ['#servicios', 'Servicios'],
  ['#resultados', 'Antes y después'],
  ['#promociones', 'Promociones'],
  ['#proceso', 'Proceso'],
  ['#contacto', 'Contacto'],
  ['whatsapp', 'WhatsApp (pedir cotización)'],
  ['otro', 'Otro link…'],
];

const validar = ({ hero }) => {
  if (requerido(hero.titulo[0])) return 'El título del inicio no puede quedar vacío.';
  for (const b of hero.botones) {
    if (!b.texto.trim()) return 'Cada botón necesita un texto (o quitalo).';
    if (b.enlace !== 'whatsapp' && !b.enlace.startsWith('#') && !/^https?:\/\/\S+\.\S+/.test(b.enlace)) return `El link del botón “${b.texto}” no es válido. Tiene que empezar con https://`;
  }
  return '';
};

export function Inicio() {
  const ed = useEditor(['hero', 'manifiesto']);
  const { hero, manifiesto } = ed.valor;
  const setHero = (k, v) => ed.set('hero', (h) => ({ ...h, [k]: v }));
  const setMan = (k, v) => ed.set('manifiesto', (m) => ({ ...m, [k]: v }));
  const setBoton = (i, k, v) => setHero('botones', hero.botones.map((b, j) => (j === i ? { ...b, [k]: v } : b)));

  return (
    <>
      <Cabecera titulo="Inicio" descripcion="Lo primero que ve quien entra a la web." />
      <div class="grilla-form">
        <Tarjeta titulo="Texto principal" descripcion="Dos líneas: la segunda se muestra con contorno.">
          <Fila>
            <Texto etiqueta="Línea 1" valor={hero.titulo[0]} onCambio={(v) => setHero('titulo', [v, hero.titulo[1]])} max={40} />
            <Texto etiqueta="Línea 2" valor={hero.titulo[1]} onCambio={(v) => setHero('titulo', [hero.titulo[0], v])} max={40} opcional />
          </Fila>
          <Texto etiqueta="Descripción" valor={hero.bajada} onCambio={(v) => setHero('bajada', v)} multilinea max={220} />
          <Texto etiqueta="Pista del efecto de pulido" valor={hero.pista} onCambio={(v) => setHero('pista', v)} max={60} ayuda="Aparece sobre la foto, invitando a pasar el mouse." />
        </Tarjeta>

        <Tarjeta titulo="Imagen principal" descripcion="Horizontal, mínimo 1600 px de ancho. Se usa también al compartir la web si no cargás otra en SEO.">
          <CampoImagen valor={hero.foto} onCambio={(v) => setHero('foto', v)} alt={hero.fotoAlt} onAlt={(v) => setHero('fotoAlt', v)} carpeta="hero" quitable={false} />
        </Tarjeta>

        <Tarjeta titulo="Botones" descripcion="El primero es el botón verde.">
          {hero.botones.map((b, i) => {
            const tipo = DESTINOS.some(([d]) => d === b.enlace) ? b.enlace : 'otro';
            return (
              <div class="sub-bloque" key={i}>
                <div class="sub-bloque-head">
                  <strong>Botón {i + 1}{i === 0 ? ' (principal)' : ''}</strong>
                  <span>
                    <IconoBoton icono="arriba" etiqueta="Subir" disabled={i === 0} onClick={() => setHero('botones', mover(hero.botones, i, -1))} />
                    <IconoBoton icono="basura" etiqueta="Quitar botón" onClick={() => setHero('botones', hero.botones.filter((_, j) => j !== i))} />
                  </span>
                </div>
                <Fila>
                  <Texto etiqueta="Texto" valor={b.texto} onCambio={(v) => setBoton(i, 'texto', v)} max={32} />
                  <Seleccion etiqueta="Lleva a" valor={tipo} opciones={DESTINOS} onCambio={(v) => setBoton(i, 'enlace', v === 'otro' ? 'https://' : v)} />
                </Fila>
                {tipo === 'otro' && <Texto etiqueta="Link" valor={b.enlace} onCambio={(v) => setBoton(i, 'enlace', v)} placeholder="https://…" />}
                {tipo === 'whatsapp' && <p class="campo-msj">Abre WhatsApp con el número y el mensaje de “Datos del negocio”.</p>}
              </div>
            );
          })}
          {hero.botones.length < 2 && <Boton chico icono="mas" onClick={() => setHero('botones', [...hero.botones, { texto: 'Ver resultados', enlace: '#resultados' }])}>Agregar botón</Boton>}
        </Tarjeta>

        <Tarjeta titulo="Manifiesto" descripcion="La frase grande con foto que sigue al inicio, y sus datos.">
          <Fila>
            <Texto etiqueta="Frase, línea 1" valor={manifiesto.frase[0]} onCambio={(v) => setMan('frase', [v, manifiesto.frase[1]])} max={40} />
            <Texto etiqueta="Frase, línea 2" valor={manifiesto.frase[1]} onCambio={(v) => setMan('frase', [manifiesto.frase[0], v])} max={40} opcional />
          </Fila>
          <CampoImagen etiqueta="Foto (vertical)" valor={manifiesto.foto} onCambio={(v) => setMan('foto', v)} alt={manifiesto.fotoAlt} onAlt={(v) => setMan('fotoAlt', v)} carpeta="nosotros" />
          <p class="campo-etiqueta">Datos</p>
          {manifiesto.datos.map((d, i) => (
            <div class="fila fila-datos" key={i}>
              <Texto etiqueta="Dato" valor={d.valor} onCambio={(v) => setMan('datos', manifiesto.datos.map((x, j) => (j === i ? { ...x, valor: v } : x)))} max={16} />
              <Texto etiqueta="Qué es" valor={d.texto} onCambio={(v) => setMan('datos', manifiesto.datos.map((x, j) => (j === i ? { ...x, texto: v } : x)))} max={40} />
              <IconoBoton icono="basura" etiqueta="Quitar dato" onClick={() => setMan('datos', manifiesto.datos.filter((_, j) => j !== i))} />
            </div>
          ))}
          {manifiesto.datos.length < 4 && <Boton chico icono="mas" onClick={() => setMan('datos', [...manifiesto.datos, { valor: '', texto: '' }])}>Agregar dato</Boton>}
          <p class="campo-msj">Usá datos de la oferta (ej.: “Sin cargo · Revisión de pintura”), no números de resultados que no puedas respaldar.</p>
        </Tarjeta>
      </div>
      <BarraGuardar editor={ed} validar={validar} />
    </>
  );
}

// Reutilizado por otras pantallas: título de sección (dos líneas) + visibilidad.
export function TituloSeccion({ ed, clave, conTexto = false, unaLinea = false }) {
  const sec = ed.valor.secciones[clave];
  const set = (k, v) => ed.set('secciones', (s) => ({ ...s, [clave]: { ...s[clave], [k]: v } }));
  return (
    <Tarjeta titulo="Encabezado de la sección">
      {unaLinea ? (
        <Texto etiqueta="Título" valor={sec.titulo} onCambio={(v) => set('titulo', v)} max={40} />
      ) : (
        <Fila>
          <Texto etiqueta="Título, línea 1" valor={sec.titulo[0]} onCambio={(v) => set('titulo', [v, sec.titulo[1]])} max={40} />
          <Texto etiqueta="Título, línea 2" valor={sec.titulo[1]} onCambio={(v) => set('titulo', [sec.titulo[0], v])} max={40} opcional />
        </Fila>
      )}
      {conTexto && <Texto etiqueta="Texto de introducción" valor={sec.texto} onCambio={(v) => set('texto', v)} multilinea filas={2} max={220} opcional />}
    </Tarjeta>
  );
}

export { ListaTextos };
