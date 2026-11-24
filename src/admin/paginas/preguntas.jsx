// Preguntas frecuentes.
import { Cabecera, Tarjeta, Texto, BarraGuardar, useEditor } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId } from '../../js/contenido.js';

const nuevo = () => ({ id: nuevoId('pregunta'), pregunta: '', respuesta: '' });

function Formulario({ item, set, errores }) {
  return (
    <>
      <Texto etiqueta="Pregunta" valor={item.pregunta} onCambio={(v) => set('pregunta', v)} error={errores.pregunta} max={120} autoFocus />
      <Texto etiqueta="Respuesta" valor={item.respuesta} onCambio={(v) => set('respuesta', v)} multilinea filas={5} max={600} error={errores.respuesta} />
    </>
  );
}

export function Preguntas() {
  const ed = useEditor(['preguntas', 'secciones']);
  return (
    <>
      <Cabecera titulo="Preguntas frecuentes" descripcion="Aparecen en la sección de contacto, como acordeón." />
      <Tarjeta titulo="Preguntas">
        <ListaEditable
          items={ed.valor.preguntas}
          onCambio={(l) => ed.set('preguntas', l)}
          nuevo={nuevo}
          etiqueta="pregunta"
          agregarTexto="Agregar pregunta"
          titulo={(q) => q.pregunta}
          subtitulo={(q) => q.respuesta.slice(0, 90) + (q.respuesta.length > 90 ? '…' : '')}
          Formulario={Formulario}
          validar={(q) => limpiar({ pregunta: requerido(q.pregunta), respuesta: requerido(q.respuesta) })}
        />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="preguntas" unaLinea />
      <BarraGuardar editor={ed} />
    </>
  );
}
