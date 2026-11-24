// Textos de las dos demos interactivas: luz de inspección (pulido) y agua (cerámico).
// Las animaciones no se tocan: solo cambian los textos y las tarjetas de duración.
import { Cabecera, Tarjeta, Texto, Numero, Fila, Seleccion, Interruptor, BarraGuardar, useEditor, IconoBoton, Boton } from '../ui.jsx';
import { useEstado } from '../store.js';

export function Demos() {
  const s = useEstado();
  const ed = useEditor(['pulido', 'ceramico']);
  const { pulido, ceramico } = ed.valor;
  const setP = (k, v) => ed.set('pulido', (x) => ({ ...x, [k]: v }));
  const setC = (k, v) => ed.set('ceramico', (x) => ({ ...x, [k]: v }));
  const setEtapa = (i, k, v) => setP('etapas', pulido.etapas.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const setDur = (i, k, v) => setC('duraciones', ceramico.duraciones.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const paquetes = [['', 'Ninguno (sin link)'], ...s.borrador.paquetes.map((p) => [p.id, p.nombre])];

  return (
    <>
      <Cabecera titulo="Pulido y cerámico" descripcion="Textos de las dos demos interactivas. Las animaciones quedan igual." />
      <div class="grilla-form">
        <Tarjeta titulo="Pulido · luz de inspección">
          <Fila>
            <Texto etiqueta="Título, línea 1" valor={pulido.titulo[0]} onCambio={(v) => setP('titulo', [v, pulido.titulo[1]])} max={40} />
            <Texto etiqueta="Título, línea 2" valor={pulido.titulo[1]} onCambio={(v) => setP('titulo', [pulido.titulo[0], v])} max={40} opcional />
          </Fila>
          <Texto etiqueta="Texto" valor={pulido.texto} onCambio={(v) => setP('texto', v)} multilinea max={240} />
          {pulido.etapas.map((e, i) => (
            <div class="sub-bloque" key={i}>
              <div class="sub-bloque-head"><strong>Etapa {i + 1}</strong></div>
              <Fila cols={3}>
                <Texto etiqueta="Botón" valor={e.nombre} onCambio={(v) => setEtapa(i, 'nombre', v)} max={16} />
                <Texto etiqueta="Título" valor={e.titulo} onCambio={(v) => setEtapa(i, 'titulo', v)} max={24} />
                <Numero etiqueta="Defectos (simulación)" valor={e.defectos} onCambio={(v) => setEtapa(i, 'defectos', v)} sufijo="%" min={0} max={100} />
              </Fila>
              <Texto etiqueta="Texto" valor={e.texto} onCambio={(v) => setEtapa(i, 'texto', v)} multilinea filas={2} max={160} />
            </div>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Cerámico · agua sobre el panel">
          <Fila>
            <Texto etiqueta="Título, línea 1" valor={ceramico.titulo[0]} onCambio={(v) => setC('titulo', [v, ceramico.titulo[1]])} max={40} />
            <Texto etiqueta="Título, línea 2" valor={ceramico.titulo[1]} onCambio={(v) => setC('titulo', [ceramico.titulo[0], v])} max={40} opcional />
          </Fila>
          <Texto etiqueta="Texto" valor={ceramico.texto} onCambio={(v) => setC('texto', v)} multilinea max={240} />
          <Fila>
            <Texto etiqueta="Con cerámico: comportamiento" valor={ceramico.modos.con.comportamiento} onCambio={(v) => setC('modos', { ...ceramico.modos, con: { ...ceramico.modos.con, comportamiento: v } })} max={40} />
            <Texto etiqueta="Sin cerámico: comportamiento" valor={ceramico.modos.sin.comportamiento} onCambio={(v) => setC('modos', { ...ceramico.modos, sin: { ...ceramico.modos.sin, comportamiento: v } })} max={40} />
          </Fila>
          <p class="campo-etiqueta">Tarjetas de duración</p>
          {ceramico.duraciones.map((d, i) => (
            <div class="sub-bloque" key={i}>
              <div class="sub-bloque-head">
                <strong>Tarjeta {i + 1}</strong>
                <IconoBoton icono="basura" etiqueta="Quitar tarjeta" onClick={() => setC('duraciones', ceramico.duraciones.filter((_, j) => j !== i))} />
              </div>
              <Fila>
                <Texto etiqueta="Duración" valor={d.anios} onCambio={(v) => setDur(i, 'anios', v)} max={12} placeholder="Ej.: 2 años" />
                <Seleccion etiqueta="Paquete del cotizador" valor={d.paquete} onCambio={(v) => setDur(i, 'paquete', v)} opciones={paquetes} />
              </Fila>
              <Texto etiqueta="Texto" valor={d.texto} onCambio={(v) => setDur(i, 'texto', v)} max={90} />
              <Interruptor etiqueta="Destacada" valor={d.destacado} onCambio={(v) => setDur(i, 'destacado', v)} />
            </div>
          ))}
          {ceramico.duraciones.length < 3 && <Boton chico icono="mas" onClick={() => setC('duraciones', [...ceramico.duraciones, { anios: '', paquete: '', texto: '', destacado: false }])}>Agregar tarjeta</Boton>}
        </Tarjeta>
      </div>
      <BarraGuardar editor={ed} />
    </>
  );
}
