// Consultas del cotizador: lista con búsqueda y filtros, detalle con estado, notas internas,
// historial y botón para responder por WhatsApp.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { supabase, mensajeError } from '../supabase.js';
import { useEstado } from '../store.js';
import { Cabecera, Tarjeta, Cargando, Aviso, Vacio, Boton, Icono, Insignia, useToast, confirmar, formatoPesos, formatoFecha, haceCuanto } from '../ui.jsx';

export const ESTADOS = [
  ['nueva', 'Nueva', 'acento'],
  ['contactada', 'Contactada', 'info'],
  ['presupuesto_enviado', 'Presupuesto enviado', 'violeta'],
  ['convertida', 'Convertida', 'ok'],
  ['descartada', 'Descartada', 'neutro'],
];
const ESTADO = Object.fromEntries(ESTADOS.map(([k, t, tono]) => [k, { t, tono }]));
const POR_PAGINA = 40;
const CAMPOS_LISTA = 'id, codigo, creada_en, estado, nombre, telefono, tamano, principal, principal_tipo, total, tiempo';

const queryHash = () => new URLSearchParams(location.hash.split('?')[1] ?? '');

// Número argentino para wa.me: 54 9 + característica + número, sin 0 ni 15.
export function telefonoWhatsApp(t) {
  let d = String(t ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // 2284 15 611455 → 2284 611455 (el 15 va después de la característica de 2 a 4 dígitos)
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  return d.length === 10 ? `549${d}` : d.length >= 8 ? d : '';
}

const limpiarBusqueda = (q) => q.replace(/[,()%*\\]/g, ' ').trim().slice(0, 60);

export function Consultas() {
  const [filtro, setFiltro] = useState(queryHash().get('estado') ?? 'todas');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filas, setFilas] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [conteos, setConteos] = useState({});
  const [error, setError] = useState('');
  const [cargandoMas, setCargandoMas] = useState(false);
  const toast = useToast();

  useEffect(() => { const t = setTimeout(() => setBusqueda(limpiarBusqueda(q)), 300); return () => clearTimeout(t); }, [q]);

  const consulta = (desde) => {
    let c = supabase.from('consultas').select(CAMPOS_LISTA).order('creada_en', { ascending: false }).range(desde, desde + POR_PAGINA - 1);
    if (filtro !== 'todas') c = c.eq('estado', filtro);
    if (busqueda) c = c.or(['nombre', 'telefono', 'codigo', 'principal'].map((k) => `${k}.ilike.%${busqueda}%`).join(','));
    return c;
  };

  const cargar = async () => {
    setError('');
    setFilas(null);
    const [{ data, error: e }, ...cuentas] = await Promise.all([
      consulta(0),
      ...ESTADOS.map(([k]) => supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', k)),
    ]);
    if (e) return setError(mensajeError(e));
    setFilas(data);
    setHayMas(data.length === POR_PAGINA);
    setConteos(Object.fromEntries(ESTADOS.map(([k], i) => [k, cuentas[i].count ?? 0])));
  };
  useEffect(() => { cargar(); }, [filtro, busqueda]);

  const masFilas = async () => {
    setCargandoMas(true);
    const { data, error: e } = await consulta(filas.length);
    setCargandoMas(false);
    if (e) return toast(mensajeError(e), 'error');
    setFilas([...filas, ...data]);
    setHayMas(data.length === POR_PAGINA);
  };

  const exportar = async () => {
    let c = supabase.from('consultas').select('codigo, creada_en, estado, nombre, telefono, tamano, principal, estado_pintura, extras, total, tiempo, notas').order('creada_en', { ascending: false }).limit(2000);
    if (filtro !== 'todas') c = c.eq('estado', filtro);
    const { data, error: e } = await c;
    if (e) return toast(mensajeError(e), 'error');
    const cols = ['codigo', 'creada_en', 'estado', 'nombre', 'telefono', 'tamano', 'principal', 'estado_pintura', 'extras', 'total', 'tiempo', 'notas'];
    const celda = (v) => `"${String(Array.isArray(v) ? v.map((x) => x.nombre).join(' + ') : v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(';'), ...data.map((f) => cols.map((k) => celda(k === 'estado' ? ESTADO[f[k]]?.t : f[k])).join(';'))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `consultas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = Object.values(conteos).reduce((s, n) => s + n, 0);

  return (
    <>
      <Cabecera
        titulo="Consultas"
        descripcion="Cada vez que alguien pide una cotización desde el cotizador, queda guardada acá antes de abrir WhatsApp."
        acciones={<Boton chico icono="descargar" onClick={exportar} disabled={!total}>Exportar CSV</Boton>}
      />
      <div class="filtros">
        <div class="filtro-chips" role="group" aria-label="Filtrar por estado">
          <button type="button" class="chip" aria-pressed={filtro === 'todas' ? 'true' : 'false'} onClick={() => setFiltro('todas')}>Todas <span>{total}</span></button>
          {ESTADOS.map(([k, t]) => (
            <button key={k} type="button" class="chip" aria-pressed={filtro === k ? 'true' : 'false'} onClick={() => setFiltro(k)}>{t} <span>{conteos[k] ?? 0}</span></button>
          ))}
        </div>
        <label class="buscador">
          <Icono n="buscar" />
          <span class="visually-hidden">Buscar</span>
          <input type="search" placeholder="Buscar por nombre, teléfono, código o servicio" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
        </label>
      </div>

      {error ? (
        <Aviso tono="error" titulo="No se pudieron cargar las consultas" acciones={<Boton chico onClick={cargar}>Reintentar</Boton>}>{error}</Aviso>
      ) : !filas ? (
        <Cargando />
      ) : filas.length === 0 ? (
        <Tarjeta>
          {busqueda || filtro !== 'todas' ? (
            <Vacio icono="buscar" titulo="No hay consultas con ese filtro" texto="Probá con otra búsqueda o mirá todas." >
              <Boton chico onClick={() => { setFiltro('todas'); setQ(''); }}>Ver todas</Boton>
            </Vacio>
          ) : (
            <Vacio icono="consultas" titulo="Todavía no llegó ninguna consulta" texto="Cuando alguien arme un presupuesto en la web y toque “Pedir cotización por WhatsApp”, lo vas a ver acá con todo el detalle." />
          )}
        </Tarjeta>
      ) : (
        <div class="tabla-caja">
          <table class="tabla">
            <thead>
              <tr><th>Cliente</th><th>Pedido</th><th class="num">Estimado</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} onClick={() => { location.hash = `#/consultas/${f.id}`; }}>
                  <td>
                    <a href={`#/consultas/${f.id}`} class="celda-principal">{f.nombre || 'Sin nombre'}</a>
                    <span class="celda-sub">{f.telefono || <span class="dato">{f.codigo}</span>}</span>
                  </td>
                  <td>{f.principal}<span class="celda-sub">{f.tamano}</span></td>
                  <td class="num dato">{formatoPesos(f.total)}</td>
                  <td><Insignia tono={ESTADO[f.estado]?.tono}>{ESTADO[f.estado]?.t}</Insignia></td>
                  <td><time title={formatoFecha(f.creada_en)}>{haceCuanto(f.creada_en)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
          {hayMas && <div class="tabla-mas"><Boton chico cargando={cargandoMas} onClick={masFilas}>Cargar más</Boton></div>}
        </div>
      )}
    </>
  );
}

export function DetalleConsulta({ params: [id] }) {
  const s = useEstado();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState('');

  const cargar = async () => {
    const [{ data, error: e }, { data: h }] = await Promise.all([
      supabase.from('consultas').select('*').eq('id', id).maybeSingle(),
      supabase.from('consulta_historial').select('*').eq('consulta_id', id).order('creado_en', { ascending: false }),
    ]);
    if (e) return setError(mensajeError(e));
    if (!data) return setError('La consulta no existe o fue eliminada.');
    setC(data);
    setNotas(data.notas ?? '');
    setHistorial(h ?? []);
  };
  useEffect(() => { cargar(); }, [id]);

  const cambiarEstado = async (estado) => {
    setGuardando(estado);
    const { error: e } = await supabase.from('consultas').update({ estado }).eq('id', id);
    setGuardando('');
    if (e) return toast(mensajeError(e), 'error');
    toast(`Estado: ${ESTADO[estado].t}`);
    cargar();
  };
  const guardarNotas = async () => {
    setGuardando('notas');
    const { error: e } = await supabase.from('consultas').update({ notas: notas.trim() || null }).eq('id', id);
    setGuardando('');
    if (e) return toast(mensajeError(e), 'error');
    toast('Notas guardadas.');
    cargar();
  };
  const eliminar = async () => {
    const ok = await confirmar({ titulo: 'Eliminar consulta', texto: 'Se borra la consulta y su historial. No se puede deshacer.', aceptar: 'Eliminar', peligro: true });
    if (!ok) return;
    const { error: e } = await supabase.from('consultas').delete().eq('id', id);
    if (e) return toast(mensajeError(e), 'error');
    toast('Consulta eliminada.');
    location.hash = '#/consultas';
  };

  const tel = useMemo(() => telefonoWhatsApp(c?.telefono), [c]);
  if (error) return <><Cabecera titulo="Consulta" /><Aviso tono="error" titulo={error}><a href="#/consultas">Volver a consultas</a></Aviso></>;
  if (!c) return <Cargando />;

  const negocio = s.borrador?.nombreCorto ?? '';
  const respuesta = `Hola${c.nombre ? ` ${c.nombre}` : ''}, te escribo de ${negocio} por el presupuesto que armaste en la web (${c.codigo}): ${c.principal}, ${c.tamano?.toLowerCase()}, estimado ${formatoPesos(c.total)}. ¿Cuándo te queda bien traer el auto para revisarlo?`;
  const notasCambiaron = (notas.trim() || null) !== (c.notas ?? null);

  return (
    <>
      <a href="#/consultas" class="volver"><Icono n="arriba" style={{ transform: 'rotate(-90deg)' }} /> Consultas</a>
      <Cabecera
        titulo={c.nombre || 'Consulta sin nombre'}
        descripcion={<><span class="dato">{c.codigo}</span> · {formatoFecha(c.creada_en)}</>}
        acciones={<Insignia tono={ESTADO[c.estado].tono}>{ESTADO[c.estado].t}</Insignia>}
      />
      <div class="grilla-detalle">
        <div class="col-principal">
          <Tarjeta titulo="Presupuesto armado">
            <dl class="datos">
              <div><dt>Vehículo</dt><dd>{c.tamano}</dd></div>
              <div><dt>{c.principal_tipo === 'servicio' ? 'Servicio' : 'Paquete'}</dt><dd>{c.principal}</dd></div>
              <div><dt>Estado de la pintura</dt><dd>{c.estado_pintura}</dd></div>
              <div><dt>Extras</dt><dd>{c.extras?.length ? c.extras.map((x) => x.nombre).join(', ') : 'Ninguno'}</dd></div>
              <div><dt>Tiempo estimado</dt><dd>{c.tiempo}</dd></div>
            </dl>
            <table class="desglose">
              <tbody>
                {c.desglose.map((d, i) => <tr key={i}><td>{d.concepto}</td><td class="num dato">{formatoPesos(d.monto)}</td></tr>)}
              </tbody>
              <tfoot><tr><td>Estimado</td><td class="num dato">{formatoPesos(c.total)}</td></tr></tfoot>
            </table>
            <p class="nota-chica">El precio se recalculó en el servidor con los precios publicados en ese momento.</p>
          </Tarjeta>

          <Tarjeta titulo="Estado" descripcion="Movelo a medida que avanza la conversación.">
            <div class="estados-botones" role="group" aria-label="Cambiar estado">
              {ESTADOS.map(([k, t, tono]) => (
                <button key={k} type="button" class={`estado-op estado-${tono}`} aria-pressed={c.estado === k ? 'true' : 'false'} disabled={!!guardando} onClick={() => c.estado !== k && cambiarEstado(k)}>
                  {guardando === k ? <span class="spinner" /> : null}{t}
                </button>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Notas internas" descripcion="Solo las ve el equipo. El cliente nunca las ve.">
            <div class="campo">
              <label for="notas" class="visually-hidden">Notas internas</label>
              <textarea id="notas" rows={4} maxLength={4000} value={notas} onInput={(e) => setNotas(e.currentTarget.value)} placeholder="Ej.: Viene el jueves a las 10. Pidió ver opciones de cerámico." />
            </div>
            <div class="acciones-derecha">
              {notasCambiaron && <Boton variante="fantasma" chico onClick={() => setNotas(c.notas ?? '')}>Cancelar</Boton>}
              <Boton variante="primario" chico cargando={guardando === 'notas'} disabled={!notasCambiaron} onClick={guardarNotas}>Guardar notas</Boton>
            </div>
          </Tarjeta>
        </div>

        <div class="col-lateral">
          <Tarjeta titulo="Contacto">
            <dl class="datos datos-1">
              <div><dt>Nombre</dt><dd>{c.nombre || '—'}</dd></div>
              <div><dt>Teléfono / WhatsApp</dt><dd>{c.telefono || '—'}</dd></div>
            </dl>
            {tel ? (
              <a class="boton boton-primario boton-ancho" href={`https://wa.me/${tel}?text=${encodeURIComponent(respuesta)}`} target="_blank" rel="noopener"><Icono n="whatsapp" /><span>Responder por WhatsApp</span></a>
            ) : (
              <Aviso tono="info">No dejó teléfono. El cliente te escribió por WhatsApp con la referencia <strong class="dato">{c.codigo}</strong>: buscala en tus chats.</Aviso>
            )}
            <Boton chico variante="fantasma" icono="copiar" class="boton-ancho" onClick={() => navigator.clipboard.writeText(respuesta).then(() => toast('Mensaje copiado.'))}>Copiar mensaje de respuesta</Boton>
          </Tarjeta>

          <Tarjeta titulo="Mensaje que mandó">
            <pre class="mensaje">{c.mensaje}</pre>
          </Tarjeta>

          <Tarjeta titulo="Historial">
            <ol class="historial">
              {historial.map((h) => (
                <li key={h.id}>
                  <strong>{h.tipo === 'creada' ? 'Consulta recibida' : h.tipo === 'estado' ? `Estado: ${h.detalle.split(' → ').map((x) => ESTADO[x]?.t ?? x).join(' → ')}` : 'Notas actualizadas'}</strong>
                  {h.tipo === 'nota' && h.detalle && <span class="historial-nota">{h.detalle}</span>}
                  <time>{formatoFecha(h.creado_en)}</time>
                </li>
              ))}
            </ol>
          </Tarjeta>

          <Boton variante="peligro-suave" chico icono="basura" onClick={eliminar}>Eliminar consulta</Boton>
        </div>
      </div>
    </>
  );
}
