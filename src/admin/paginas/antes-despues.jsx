// Comparaciones antes/después (el comparador interactivo de "Resultados").
import { useState } from 'preact/hooks';
import { Cabecera, Tarjeta, Texto, Fila, CampoImagen, Interruptor, Seleccion, BarraGuardar, useEditor } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId, CATEGORIAS_TRABAJO } from '../../js/contenido.js';
import { urlFoto } from '../imagenes.js';

const nombreCat = Object.fromEntries(CATEGORIAS_TRABAJO);
const nuevo = () => ({ id: nuevoId('comparacion'), nombre: '', categoria: 'pintura', antes: null, despues: null, alt: '', pie: '', visible: true });

// Mini comparador para revisar el par antes de guardarlo.
function Comparador({ antes, despues }) {
  const [x, setX] = useState(50);
  if (!despues) return null;
  return (
    <div class="mini-comp">
      <div class="mini-comp-marco" style={{ '--x': `${x}%` }}>
        <img src={urlFoto(despues)} alt="" />
        <img src={urlFoto(antes ?? despues)} alt="" class={`mini-comp-antes${antes ? '' : ' simulada'}`} />
        <span class="mini-comp-linea" />
      </div>
      <input type="range" min="0" max="100" value={x} onInput={(e) => setX(Number(e.currentTarget.value))} aria-label="Mover la línea del comparador" />
    </div>
  );
}

function Formulario({ item, set, errores }) {
  return (
    <>
      <Fila>
        <Texto etiqueta="Nombre del trabajo" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={24} ayuda="Es el botón para elegir la comparación." />
        <Seleccion etiqueta="Categoría" valor={item.categoria} onCambio={(v) => set('categoria', v)} opciones={CATEGORIAS_TRABAJO} />
      </Fila>
      <Fila>
        <CampoImagen etiqueta="Antes" valor={item.antes} onCambio={(v) => set('antes', v)} carpeta="comparaciones" ayuda="Si no subís el antes, la web lo simula oscureciendo el después." />
        <CampoImagen etiqueta="Después" valor={item.despues} onCambio={(v) => set('despues', v)} carpeta="comparaciones" quitable={false} />
      </Fila>
      {errores.despues && <p class="campo-msj campo-msj-error">{errores.despues}</p>}
      <Comparador antes={item.antes} despues={item.despues} />
      <Texto etiqueta="Descripción" valor={item.pie} onCambio={(v) => set('pie', v)} max={80} placeholder="Ej.: Capó negro · pulido de dos pasos" />
      <Texto etiqueta="Texto alternativo" valor={item.alt} onCambio={(v) => set('alt', v)} max={120} ayuda="Qué se ve en las fotos (ej.: “Panel de pintura negra”)." />
      <Interruptor etiqueta="Visible en la web" valor={item.visible} onCambio={(v) => set('visible', v)} />
    </>
  );
}

export function AntesDespues() {
  const ed = useEditor(['resultados', 'secciones']);
  return (
    <>
      <Cabecera titulo="Antes y después" descripcion="Cada comparación aparece como un botón al lado del comparador. La primera es la que se ve al entrar." />
      <Tarjeta titulo="Comparaciones">
        <ListaEditable
          items={ed.valor.resultados}
          onCambio={(l) => ed.set('resultados', l)}
          nuevo={nuevo}
          etiqueta="comparación"
          agregarTexto="Agregar comparación"
          titulo={(r) => r.nombre}
          subtitulo={(r) => [nombreCat[r.categoria], r.pie].filter(Boolean).join(' · ')}
          foto={(r) => r.despues}
          insignias={(r) => [!r.antes && ['Antes simulado', 'neutro']]}
          campoVisible="visible"
          Formulario={Formulario}
          validar={(r) => limpiar({ nombre: requerido(r.nombre), despues: r.despues ? undefined : 'Subí al menos la foto del después.' })}
        />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="resultados" conTexto />
      <BarraGuardar editor={ed} />
    </>
  );
}
