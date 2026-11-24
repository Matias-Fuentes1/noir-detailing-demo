// Proceso de trabajo (la tira de pasos con línea LED).
import { Cabecera, Tarjeta, Texto, CampoImagen, BarraGuardar, useEditor } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId } from '../../js/contenido.js';

const nuevo = () => ({ id: nuevoId('paso'), titulo: '', texto: '', foto: null, fotoAlt: '' });

function Formulario({ item, set, errores }) {
  return (
    <>
      <Texto etiqueta="Título" valor={item.titulo} onCambio={(v) => set('titulo', v)} error={errores.titulo} max={24} autoFocus />
      <Texto etiqueta="Descripción" valor={item.texto} onCambio={(v) => set('texto', v)} multilinea filas={3} max={180} error={errores.texto} />
      <CampoImagen etiqueta="Foto" valor={item.foto} onCambio={(v) => set('foto', v)} alt={item.fotoAlt} onAlt={(v) => set('fotoAlt', v)} carpeta="proceso" />
    </>
  );
}

export function Proceso() {
  const ed = useEditor(['proceso', 'secciones']);
  const n = ed.valor.proceso.length;
  return (
    <>
      <Cabecera titulo="Proceso" descripcion="Los pasos se numeran solos según el orden de la lista." />
      <Tarjeta titulo={`Pasos (${n})`} descripcion={n !== 5 && /cinco/i.test(ed.valor.secciones.proceso.titulo.join(' ')) ? 'Ojo: el título dice “cinco pasos”. Actualizalo abajo.' : undefined}>
        <ListaEditable
          items={ed.valor.proceso}
          onCambio={(l) => ed.set('proceso', l)}
          nuevo={nuevo}
          etiqueta="paso"
          titulo={(s) => s.titulo}
          subtitulo={(s) => s.texto}
          foto={(s) => s.foto}
          Formulario={Formulario}
          validar={(s) => limpiar({ titulo: requerido(s.titulo), texto: requerido(s.texto) })}
          minimo={1}
        />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="proceso" />
      <BarraGuardar editor={ed} />
    </>
  );
}
