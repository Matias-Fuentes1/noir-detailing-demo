// Cotizador: tamaños, paquetes, servicios sueltos, estado de la pintura, extras y textos.
// Todo usa la MISMA función de cálculo que la web y la API (src/js/calculo.js), así que el
// simulador de la derecha muestra exactamente lo que va a ver el cliente.
import { useMemo, useState } from 'preact/hooks';
import { Cabecera, Tarjeta, Texto, Numero, Fila, Interruptor, Seleccion, BarraGuardar, useEditor, ListaTextos, IconoBoton, Boton, Aviso, Insignia, formatoPesos, mover } from '../ui.jsx';
import { ListaEditable, requerido, precioValido, limpiar } from '../lista.jsx';
import { nuevoId, normalizar, SILUETAS_DISPONIBLES } from '../../js/contenido.js';
import { calcular, opcionesPrincipales, tamanosActivos, extrasActivos } from '../../js/calculo.js';
import { useEstado } from '../store.js';

const PESTANAS = [
  ['tamanos', 'Tamaños'],
  ['paquetes', 'Paquetes'],
  ['sueltos', 'Servicios sueltos'],
  ['estados', 'Estado de la pintura'],
  ['extras', 'Extras'],
  ['textos', 'Textos y reglas'],
];

const mult = (m) => `×${String(Math.round(Number(m) * 100) / 100).replace('.', ',')}`;

function FormTamano({ item, set, errores }) {
  return (
    <>
      <Fila>
        <Texto etiqueta="Nombre" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={20} autoFocus />
        <Texto etiqueta="Ejemplos de autos" valor={item.ejemplo} onCambio={(v) => set('ejemplo', v)} max={40} placeholder="Ej.: Gol, Onix, 208" />
      </Fila>
      <Fila>
        <Numero etiqueta="Multiplicador de precio" valor={item.multiplicador} onCambio={(v) => set('multiplicador', v)} prefijo="×" paso={0.05} min={0.1} error={errores.multiplicador} ayuda="1 = precio base. 1,3 = 30 % más caro." />
        <Seleccion etiqueta="Dibujo" valor={item.silueta} onCambio={(v) => set('silueta', v)} opciones={SILUETAS_DISPONIBLES} />
      </Fila>
      <Interruptor etiqueta="Activo" valor={item.activo} onCambio={(v) => set('activo', v)} />
    </>
  );
}

function FormPaquete({ item, set, errores }) {
  return (
    <>
      <Texto etiqueta="Nombre" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={24} autoFocus />
      <Fila>
        <Numero etiqueta="Precio base" valor={item.precio} onCambio={(v) => set('precio', v)} prefijo="$" paso={1000} error={errores.precio} ayuda="Para un auto chico (multiplicador ×1)." />
        <Numero etiqueta="Días en el taller" valor={item.dias} onCambio={(v) => set('dias', v)} paso={0.5} ayuda="0 = en el día." />
      </Fila>
      <ListaTextos etiqueta="Qué incluye" valores={item.incluye} onCambio={(v) => set('incluye', v)} placeholder="Agregar línea" />
      <Interruptor etiqueta="Trabaja la pintura" ayuda="Suma el recargo por estado de la pintura." valor={item.pintura} onCambio={(v) => set('pintura', v)} />
      <Interruptor etiqueta="Activo" valor={item.activo} onCambio={(v) => set('activo', v)} />
    </>
  );
}

function FormExtra({ item, set, errores }) {
  return (
    <>
      <Texto etiqueta="Nombre" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={32} autoFocus />
      <Fila>
        <Numero etiqueta="Precio" valor={item.precio} onCambio={(v) => set('precio', v)} prefijo="$" paso={1000} error={errores.precio} ayuda="Precio fijo, no cambia con el tamaño." />
        <Numero etiqueta="Días que suma" valor={item.dias} onCambio={(v) => set('dias', v)} paso={0.5} />
      </Fila>
      <Interruptor etiqueta="Activo" valor={item.activo} onCambio={(v) => set('activo', v)} />
    </>
  );
}

function Simulador({ doc }) {
  const tamanos = tamanosActivos(doc);
  const principales = opcionesPrincipales(doc);
  const def = doc.cotizador.porDefecto;
  const [sel, setSel] = useState({ tamano: def.tamano, principal: def.principal, estado: def.estado, extras: [] });
  const r = calcular(doc, sel);
  if (!tamanos.length || !principales.length) return <Aviso tono="error">Activá al menos un tamaño y un paquete o servicio.</Aviso>;
  return (
    <div class="simulador">
      <Seleccion etiqueta="Tamaño" valor={r.tamano.id} onCambio={(v) => setSel({ ...sel, tamano: v })} opciones={tamanos.map((t) => [t.id, t.nombre])} />
      <Seleccion etiqueta="Paquete o servicio" valor={r.principal.id} onCambio={(v) => setSel({ ...sel, principal: v })} opciones={principales.map((p) => [p.id, `${p.tipo === 'paquete' ? 'Paquete' : 'Servicio'}: ${p.nombre}`])} />
      <Seleccion etiqueta="Estado de la pintura" valor={String(sel.estado)} onCambio={(v) => setSel({ ...sel, estado: Number(v) })} opciones={doc.cotizador.estados.map((e, i) => [String(i), e.nombre])} />
      <div class="sim-extras">
        {extrasActivos(doc).map((e) => (
          <label key={e.id} class="check">
            <input type="checkbox" checked={sel.extras.includes(e.id)} onChange={(ev) => setSel({ ...sel, extras: ev.currentTarget.checked ? [...sel.extras, e.id] : sel.extras.filter((x) => x !== e.id) })} />
            {e.nombre}
          </label>
        ))}
      </div>
      <table class="desglose">
        <tbody>{r.desglose.map((d, i) => <tr key={i}><td>{d.concepto}</td><td class="num dato">{formatoPesos(d.monto)}</td></tr>)}</tbody>
        <tfoot><tr><td>Estimado</td><td class="num dato">{formatoPesos(r.total)}</td></tr></tfoot>
      </table>
      <p class="sim-tiempo">Tiempo en el taller: <strong>{r.tiempo}</strong></p>
    </div>
  );
}

function TablaPrecios({ doc }) {
  const tamanos = tamanosActivos(doc);
  const principales = opcionesPrincipales(doc);
  const [estado, setEstado] = useState(doc.cotizador.porDefecto.estado);
  return (
    <>
      <div class="segmentado segmentado-chico" role="group" aria-label="Estado de la pintura">
        {doc.cotizador.estados.map((e, i) => <button key={i} type="button" aria-pressed={estado === i ? 'true' : 'false'} onClick={() => setEstado(i)}>{e.nombre}</button>)}
      </div>
      <div class="tabla-caja">
        <table class="tabla tabla-precios">
          <thead><tr><th>Sin extras</th>{tamanos.map((t) => <th key={t.id} class="num">{t.nombre}<small>{mult(t.multiplicador)}</small></th>)}</tr></thead>
          <tbody>
            {principales.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}<small class="celda-sub">{p.tipo === 'paquete' ? 'Paquete' : 'Servicio'}</small></td>
                {tamanos.map((t) => <td key={t.id} class="num dato">{formatoPesos(calcular(doc, { tamano: t.id, principal: p.id, estado, extras: [] }).total)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Cotizador() {
  const s = useEstado();
  const ed = useEditor(['paquetes', 'servicios', 'cotizador']);
  const [pestana, setPestana] = useState('tamanos');
  const { cotizador: c, paquetes, servicios } = ed.valor;
  const setC = (k, v) => ed.set('cotizador', (x) => ({ ...x, [k]: typeof v === 'function' ? v(x[k]) : v }));
  const doc = useMemo(() => normalizar({ ...s.borrador, ...ed.valor }), [ed.valor, s.borrador]);

  const validar = () => {
    if (!c.tamanos.some((t) => t.activo)) return 'Tiene que quedar al menos un tamaño activo.';
    if (!opcionesPrincipales(doc).length) return 'Tiene que quedar al menos un paquete o servicio activo en el cotizador.';
    for (const t of c.tamanos) if (!(Number(t.multiplicador) > 0)) return `El multiplicador de “${t.nombre}” tiene que ser mayor que 0.`;
    for (const e of c.estados) if (!e.nombre.trim()) return 'Hay un estado de pintura sin nombre.';
    for (const x of [...paquetes, ...c.extras]) if (precioValido(x.precio)) return `Revisá el precio de “${x.nombre}”.`;
    for (const x of servicios) if (x.enCotizador && precioValido(x.precioCotizador)) return `Revisá el precio de cotizador de “${x.nombre}”.`;
    return '';
  };

  const ejemplo = s.borrador.demo.activo;

  return (
    <>
      <Cabecera titulo="Cotizador" descripcion="Todo lo que se elige y se calcula en el presupuesto de la web. Los cambios se ven en el simulador al instante." />
      {ejemplo && <Aviso tono="demo">Los precios actuales son de ejemplo. Cargá los del local antes de publicar la web para clientes.</Aviso>}
      <div class="tabs" role="tablist" aria-label="Partes del cotizador">
        {PESTANAS.map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={pestana === k ? 'true' : 'false'} onClick={() => setPestana(k)}>{t}</button>
        ))}
      </div>

      <div class="grilla-cotizador">
        <div>
          {pestana === 'tamanos' && (
            <Tarjeta titulo="Tamaños de vehículo" descripcion="El precio base de cada paquete o servicio se multiplica por el del tamaño elegido.">
              <ListaEditable
                items={c.tamanos}
                onCambio={(l) => setC('tamanos', l)}
                nuevo={() => ({ id: nuevoId('tamano'), nombre: '', ejemplo: '', multiplicador: 1, silueta: 'mediano', activo: true })}
                etiqueta="tamaño"
                titulo={(t) => t.nombre}
                subtitulo={(t) => `${mult(t.multiplicador)} · ${t.ejemplo || 'sin ejemplos'}`}
                campoVisible="activo"
                Formulario={FormTamano}
                validar={(t) => limpiar({ nombre: requerido(t.nombre), multiplicador: Number(t.multiplicador) > 0 ? undefined : 'Tiene que ser mayor que 0.' })}
                minimo={1}
              />
            </Tarjeta>
          )}

          {pestana === 'paquetes' && (
            <Tarjeta titulo="Paquetes" descripcion="Se eligen en el paso 2 del cotizador. Las tarjetas de duración del cerámico apuntan a estos paquetes.">
              <ListaEditable
                items={paquetes}
                onCambio={(l) => ed.set('paquetes', l)}
                nuevo={() => ({ id: nuevoId('paquete'), nombre: '', precio: 0, dias: 1, pintura: true, incluye: [], activo: true })}
                etiqueta="paquete"
                titulo={(p) => p.nombre}
                subtitulo={(p) => `Base ${formatoPesos(p.precio)} · ${p.dias ? `${p.dias} día${p.dias === 1 ? '' : 's'}` : 'en el día'} · ${p.incluye.length} ítems`}
                insignias={(p) => [p.pintura && ['Recargo por pintura', 'info']]}
                campoVisible="activo"
                Formulario={FormPaquete}
                validar={(p) => limpiar({ nombre: requerido(p.nombre), precio: precioValido(p.precio) })}
              />
            </Tarjeta>
          )}

          {pestana === 'sueltos' && (
            <Tarjeta titulo="Servicios sueltos" descripcion="Precio con el que cada servicio entra al cotizador. El precio “Desde” de las tarjetas se edita en Servicios y no afecta este cálculo.">
              {servicios.length === 0 ? <p class="campo-msj">No hay servicios cargados.</p> : (
                <div class="tabla-caja">
                  <table class="tabla tabla-editable">
                    <thead><tr><th>Servicio</th><th>En el cotizador</th><th>Precio base</th><th>Días</th><th>Recargo pintura</th></tr></thead>
                    <tbody>
                      {servicios.map((sv, i) => {
                        const setS = (k, v) => ed.set('servicios', servicios.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                        return (
                          <tr key={sv.id} class={sv.activo ? '' : 'fila-apagada'}>
                            <td>{sv.nombre}{!sv.activo && <small class="celda-sub">Oculto en la web</small>}<small class="celda-sub">Tarjeta: desde {formatoPesos(sv.precio)}</small></td>
                            <td><input type="checkbox" class="check-grande" checked={sv.enCotizador} aria-label={`Ofrecer ${sv.nombre} en el cotizador`} onChange={(e) => setS('enCotizador', e.currentTarget.checked)} /></td>
                            <td><div class="input-grupo input-tabla"><span class="input-afijo">$</span><input type="number" min="0" step="1000" value={sv.precioCotizador} aria-label={`Precio base de ${sv.nombre}`} disabled={!sv.enCotizador} onInput={(e) => setS('precioCotizador', e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))} /></div></td>
                            <td><input type="number" class="input-tabla" min="0" step="0.5" value={sv.dias} aria-label={`Días de ${sv.nombre}`} disabled={!sv.enCotizador} onInput={(e) => setS('dias', Number(e.currentTarget.value) || 0)} /></td>
                            <td><input type="checkbox" class="check-grande" checked={sv.pintura} aria-label={`${sv.nombre} trabaja la pintura`} disabled={!sv.enCotizador} onChange={(e) => setS('pintura', e.currentTarget.checked)} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Tarjeta>
          )}

          {pestana === 'estados' && (
            <Tarjeta titulo="Estado de la pintura" descripcion="El slider del paso 3. El recargo se aplica solo a paquetes y servicios que trabajan la pintura.">
              {c.estados.map((e, i) => {
                const setE = (k, v) => setC('estados', c.estados.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                return (
                  <div class="sub-bloque" key={i}>
                    <div class="sub-bloque-head">
                      <strong>Posición {i + 1}</strong>
                      <span>
                        <IconoBoton icono="arriba" etiqueta="Subir" disabled={i === 0} onClick={() => setC('estados', mover(c.estados, i, -1))} />
                        <IconoBoton icono="abajo" etiqueta="Bajar" disabled={i === c.estados.length - 1} onClick={() => setC('estados', mover(c.estados, i, 1))} />
                        <IconoBoton icono="basura" etiqueta="Quitar" disabled={c.estados.length <= 1} onClick={() => setC('estados', c.estados.filter((_, j) => j !== i))} />
                      </span>
                    </div>
                    <Fila cols={3}>
                      <Texto etiqueta="Nombre" valor={e.nombre} onCambio={(v) => setE('nombre', v)} max={20} />
                      <Numero etiqueta="Recargo" valor={Math.round(e.recargo * 1000) / 10} onCambio={(v) => setE('recargo', v === '' ? 0 : Math.round(v * 10) / 1000)} sufijo="%" paso={1} />
                      <Numero etiqueta="Días que suma" valor={e.diasExtra} onCambio={(v) => setE('diasExtra', v === '' ? 0 : v)} paso={0.5} />
                    </Fila>
                  </div>
                );
              })}
              {c.estados.length < 5 && <Boton chico icono="mas" onClick={() => setC('estados', [...c.estados, { id: nuevoId('estado'), nombre: '', recargo: 0, diasExtra: 0 }])}>Agregar posición</Boton>}
            </Tarjeta>
          )}

          {pestana === 'extras' && (
            <Tarjeta titulo="Extras" descripcion="Se suman al total con su precio fijo.">
              <ListaEditable
                items={c.extras}
                onCambio={(l) => setC('extras', l)}
                nuevo={() => ({ id: nuevoId('extra'), nombre: '', precio: 0, dias: 0, activo: true })}
                etiqueta="extra"
                titulo={(e) => e.nombre}
                subtitulo={(e) => `+${formatoPesos(e.precio)}${e.dias ? ` · +${e.dias} día` : ''}`}
                campoVisible="activo"
                Formulario={FormExtra}
                validar={(e) => limpiar({ nombre: requerido(e.nombre), precio: precioValido(e.precio) })}
              />
            </Tarjeta>
          )}

          {pestana === 'textos' && (
            <Tarjeta titulo="Textos y reglas">
              <Texto etiqueta="Nota debajo del total" valor={c.nota} onCambio={(v) => setC('nota', v)} max={140} />
              <Texto etiqueta="Condiciones del presupuesto" valor={c.condiciones} onCambio={(v) => setC('condiciones', v)} multilinea filas={2} max={240} opcional />
              <Texto etiqueta="Aviso de privacidad" valor={c.privacidad} onCambio={(v) => setC('privacidad', v)} multilinea filas={2} max={240} ayuda="Explica que los datos del formulario se guardan para responder." />
              <Numero etiqueta="Redondear precios a múltiplos de" valor={c.redondeo} onCambio={(v) => setC('redondeo', v)} prefijo="$" paso={100} min={1} ayuda="Ej.: 1000 → $342.700 se muestra $343.000." />
              <p class="campo-etiqueta">Opciones elegidas al entrar</p>
              <Fila cols={3}>
                <Seleccion etiqueta="Tamaño" valor={doc.cotizador.porDefecto.tamano} onCambio={(v) => setC('porDefecto', (p) => ({ ...p, tamano: v }))} opciones={tamanosActivos(doc).map((t) => [t.id, t.nombre])} />
                <Seleccion etiqueta="Paquete o servicio" valor={doc.cotizador.porDefecto.principal} onCambio={(v) => setC('porDefecto', (p) => ({ ...p, principal: v }))} opciones={opcionesPrincipales(doc).map((p) => [p.id, p.nombre])} />
                <Seleccion etiqueta="Estado" valor={String(doc.cotizador.porDefecto.estado)} onCambio={(v) => setC('porDefecto', (p) => ({ ...p, estado: Number(v) }))} opciones={c.estados.map((e, i) => [String(i), e.nombre])} />
              </Fila>
            </Tarjeta>
          )}

          <Tarjeta titulo="Tabla de precios" descripcion="Todas las combinaciones de tamaño y paquete/servicio, sin extras. Sale de la misma fórmula que la web.">
            <TablaPrecios doc={doc} />
          </Tarjeta>
        </div>

        <aside class="col-sticky">
          <Tarjeta titulo="Simulador" descripcion="Probá el cotizador con los cambios (aunque no estén guardados).">
            <Simulador doc={doc} />
            {ed.sucio && <Insignia tono="acento">Con cambios sin guardar</Insignia>}
          </Tarjeta>
        </aside>
      </div>
      <BarraGuardar editor={ed} validar={validar} />
    </>
  );
}
