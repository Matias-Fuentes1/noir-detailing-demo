// Galería de trabajos ("Trabajos recientes" en la web).
import { Cabecera, Tarjeta, Texto, Numero, Fila, CampoImagen, Interruptor, Seleccion, BarraGuardar, useEditor, Aviso } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { nuevoId, CATEGORIAS_TRABAJO } from '../../js/contenido.js';

const nombreCat = Object.fromEntries(CATEGORIAS_TRABAJO);
const nuevo = () => ({ id: nuevoId('trabajo'), auto: '', servicio: '', descripcion: '', categoria: 'pintura', foto: null, fotoAlt: '', destacado: false, visible: true, ejemplo: false });

function Formulario({ item, set, errores }) {
  return (
    <>
      <CampoImagen etiqueta="Foto" valor={item.foto} onCambio={(v) => set('foto', v)} alt={item.fotoAlt} onAlt={(v) => set('fotoAlt', v)} carpeta="trabajos" />
      {errores.foto && <p class="campo-msj campo-msj-error">{errores.foto}</p>}
      <Fila>
        <Texto etiqueta="Nombre del trabajo" valor={item.auto} onCambio={(v) => set('auto', v)} placeholder="Ej.: Hilux negra" error={errores.auto} max={40} />
        <Texto etiqueta="Servicio" valor={item.servicio} onCambio={(v) => set('servicio', v)} placeholder="Ej.: Pulido de dos pasos" max={40} />
      </Fila>
      <Texto etiqueta="Descripción" valor={item.descripcion} onCambio={(v) => set('descripcion', v)} multilinea filas={2} max={160} opcional />
      <Seleccion etiqueta="Categoría" valor={item.categoria} onCambio={(v) => set('categoria', v)} opciones={CATEGORIAS_TRABAJO} />
      <Interruptor etiqueta="Destacado" ayuda="Los destacados aparecen primero." valor={item.destacado} onCambio={(v) => set('destacado', v)} />
      <Interruptor etiqueta="Visible en la web" valor={item.visible} onCambio={(v) => set('visible', v)} />
      <Interruptor etiqueta="Es una foto de ejemplo" ayuda="Marcalo mientras no sea un trabajo real del local." valor={item.ejemplo} onCambio={(v) => set('ejemplo', v)} />
    </>
  );
}

export function Galeria() {
  const ed = useEditor(['trabajos', 'secciones']);
  const sec = ed.valor.secciones.trabajos;
  const setSec = (k, v) => ed.set('secciones', (s) => ({ ...s, trabajos: { ...s.trabajos, [k]: v } }));
  const ejemplos = ed.valor.trabajos.filter((t) => t.ejemplo).length;
  return (
    <>
      <Cabecera titulo="Galería de trabajos" descripcion="Las fotos de “Trabajos recientes”, debajo del antes y después." />
      {ejemplos > 0 && <Aviso tono="demo" titulo={`${ejemplos} foto${ejemplos > 1 ? 's son' : ' es'} de ejemplo`}>Reemplazalas por trabajos reales del local y desmarcá “Es una foto de ejemplo”.</Aviso>}
      <Tarjeta titulo="Trabajos" descripcion="Arrastrá una foto al recuadro o tocá “Subir imagen”. Se optimiza sola (WebP de 1600 y 800 px).">
        <ListaEditable
          items={ed.valor.trabajos}
          onCambio={(l) => ed.set('trabajos', l)}
          nuevo={nuevo}
          etiqueta="trabajo"
          titulo={(t) => t.auto}
          subtitulo={(t) => [t.servicio, nombreCat[t.categoria]].filter(Boolean).join(' · ')}
          foto={(t) => t.foto}
          insignias={(t) => [t.destacado && ['Destacado', 'acento'], t.ejemplo && ['Ejemplo', 'demo']]}
          campoVisible="visible"
          Formulario={Formulario}
          validar={(t) => limpiar({ auto: requerido(t.auto), foto: t.foto ? undefined : 'Subí una foto.' })}
          grilla
        />
      </Tarjeta>
      <Tarjeta titulo="En la web">
        <Fila>
          <Texto etiqueta="Título" valor={sec.titulo} onCambio={(v) => setSec('titulo', v)} max={40} />
          <Numero etiqueta="Cuántos mostrar" valor={sec.maximo} onCambio={(v) => setSec('maximo', v)} min={1} max={12} ayuda="Destacados primero, después en el orden de la lista." />
        </Fila>
        <Interruptor etiqueta="Mostrar “Trabajos recientes”" valor={sec.visible} onCambio={(v) => setSec('visible', v)} />
      </Tarjeta>
      <BarraGuardar editor={ed} />
    </>
  );
}
