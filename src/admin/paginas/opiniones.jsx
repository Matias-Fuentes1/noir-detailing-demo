// Opiniones y testimonios. Las de la demo son ejemplos: se identifican como tales y se pueden
// reemplazar o desactivar. La web solo muestra la aclaración si hay alguna de ejemplo visible.
import { Cabecera, Tarjeta, Texto, Fila, CampoImagen, Interruptor, BarraGuardar, useEditor, Aviso, Icono } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId } from '../../js/contenido.js';

const nuevo = () => ({ id: nuevoId('opinion'), nombre: '', auto: '', estrellas: 5, texto: '', foto: null, visible: true, ejemplo: false });

function Estrellas({ valor, onCambio }) {
  return (
    <div class="campo">
      <span class="campo-etiqueta">Calificación</span>
      <div class="estrellas-input" role="radiogroup" aria-label="Estrellas">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={valor === n ? 'true' : 'false'} aria-label={`${n} estrella${n > 1 ? 's' : ''}`} class={n <= valor ? 'on' : ''} onClick={() => onCambio(n)}>
            <Icono n="estrella" tam={22} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Formulario({ item, set, errores }) {
  return (
    <>
      <Fila>
        <Texto etiqueta="Nombre del cliente" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={40} placeholder="Ej.: Martín G." />
        <Texto etiqueta="Vehículo" valor={item.auto} onCambio={(v) => set('auto', v)} max={40} opcional />
      </Fila>
      <Texto etiqueta="Comentario" valor={item.texto} onCambio={(v) => set('texto', v)} multilinea filas={4} max={300} error={errores.texto} />
      <Estrellas valor={item.estrellas} onCambio={(v) => set('estrellas', v)} />
      <CampoImagen etiqueta="Foto del cliente" valor={item.foto} onCambio={(v) => set('foto', v)} carpeta="opiniones" ayuda="Opcional. Solo con el permiso de la persona." />
      <Interruptor etiqueta="Visible en la web" valor={item.visible} onCambio={(v) => set('visible', v)} />
      <Interruptor etiqueta="Es una opinión de ejemplo" ayuda="Dejalo activo mientras no sea una reseña real. La web muestra la aclaración." valor={item.ejemplo} onCambio={(v) => set('ejemplo', v)} />
    </>
  );
}

export function Opiniones() {
  const ed = useEditor(['opiniones', 'opinionesNota', 'secciones']);
  const ejemplosVisibles = ed.valor.opiniones.filter((o) => o.ejemplo && o.visible).length;
  return (
    <>
      <Cabecera titulo="Opiniones" descripcion="Testimonios de clientes." />
      {ejemplosVisibles > 0 && (
        <Aviso tono="demo" titulo={`${ejemplosVisibles} opinión${ejemplosVisibles > 1 ? 'es' : ''} de ejemplo a la vista`}>
          No son reseñas reales. Reemplazalas por opiniones verdaderas (por ejemplo, copiadas de Google con permiso) o desactivalas con el ojo.
        </Aviso>
      )}
      <Tarjeta titulo="Testimonios">
        <ListaEditable
          items={ed.valor.opiniones}
          onCambio={(l) => ed.set('opiniones', l)}
          nuevo={nuevo}
          etiqueta="opinión"
          agregarTexto="Agregar opinión"
          titulo={(o) => o.nombre}
          subtitulo={(o) => `${'★'.repeat(o.estrellas)} · ${o.auto || 'sin vehículo'} · “${o.texto.slice(0, 60)}${o.texto.length > 60 ? '…' : ''}”`}
          insignias={(o) => [o.ejemplo && ['Ejemplo de la demo', 'demo']]}
          campoVisible="visible"
          Formulario={Formulario}
          validar={(o) => limpiar({ nombre: requerido(o.nombre), texto: requerido(o.texto) })}
        />
      </Tarjeta>
      <Tarjeta titulo="Aclaración" descripcion="Se muestra debajo de las opiniones solo si hay alguna de ejemplo visible.">
        <Texto etiqueta="Texto" valor={ed.valor.opinionesNota} onCambio={(v) => ed.set('opinionesNota', v)} max={120} />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="opiniones" />
      <BarraGuardar editor={ed} />
    </>
  );
}
