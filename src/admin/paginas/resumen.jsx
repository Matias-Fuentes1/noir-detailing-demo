// Resumen: indicadores reales (consultas, visitas, clics en WhatsApp). Sin datos inventados:
// si todavía no hay registros, se muestran estados vacíos.
import { useEffect, useState } from 'preact/hooks';
import { supabase, mensajeError } from '../supabase.js';
import { Cabecera, Tarjeta, Cargando, Aviso, Vacio, Boton, Icono, haceCuanto } from '../ui.jsx';

const PERIODOS = [[7, '7 días'], [30, '30 días'], [90, '90 días']];
const NOMBRE_ESTADO = { nueva: 'Nueva', contactada: 'Contactada', presupuesto_enviado: 'Presupuesto enviado', convertida: 'Convertida', descartada: 'Descartada' };

function Kpi({ etiqueta, valor, detalle, tono, href }) {
  const C = href ? 'a' : 'div';
  return (
    <C class={`kpi${tono ? ` kpi-${tono}` : ''}`} href={href}>
      <span class="kpi-etiqueta">{etiqueta}</span>
      <strong class="kpi-valor">{valor}</strong>
      {detalle && <span class="kpi-detalle">{detalle}</span>}
    </C>
  );
}

function Grafico({ dias }) {
  const W = 720, H = 220, pad = { t: 12, r: 8, b: 26, l: 28 };
  const maxC = Math.max(1, ...dias.map((d) => d.consultas));
  const maxV = Math.max(1, ...dias.map((d) => d.visitas));
  const ancho = (W - pad.l - pad.r) / dias.length;
  const y = (v, max) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const hayVisitas = dias.some((d) => d.visitas > 0);
  const linea = dias.map((d, i) => `${i ? 'L' : 'M'}${pad.l + ancho * i + ancho / 2},${y(d.visitas, maxV)}`).join(' ');
  const marcas = dias.length > 14 ? Math.ceil(dias.length / 7) : 1;
  const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
  return (
    <figure class="grafico">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Consultas por día: ${dias.reduce((s, d) => s + d.consultas, 0)} en total`}>
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={pad.l} x2={W - pad.r} y1={y(maxC * k, maxC)} y2={y(maxC * k, maxC)} class="grafico-guia" />
            <text x={pad.l - 6} y={y(maxC * k, maxC) + 4} class="grafico-eje" text-anchor="end">{Math.round(maxC * k)}</text>
          </g>
        ))}
        {dias.map((d, i) => (
          <g key={d.dia}>
            <rect x={pad.l + ancho * i + ancho * 0.18} width={ancho * 0.64} y={y(d.consultas, maxC)} height={Math.max(0, H - pad.b - y(d.consultas, maxC))} rx="2" class="grafico-barra">
              <title>{`${fmt.format(new Date(`${d.dia}T12:00`))}: ${d.consultas} consulta${d.consultas === 1 ? '' : 's'}, ${d.visitas} visita${d.visitas === 1 ? '' : 's'}`}</title>
            </rect>
            {i % marcas === 0 && <text x={pad.l + ancho * i + ancho / 2} y={H - 8} class="grafico-eje" text-anchor="middle">{fmt.format(new Date(`${d.dia}T12:00`))}</text>}
          </g>
        ))}
        {hayVisitas && <path d={linea} class="grafico-linea" />}
      </svg>
      <figcaption class="grafico-leyenda">
        <span><i class="ley-barra" />Consultas</span>
        {hayVisitas && <span><i class="ley-linea" />Visitas (otra escala, máx. {maxV})</span>}
      </figcaption>
    </figure>
  );
}

export function Resumen() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    setError('');
    setDatos(null);
    const { data, error: e } = await supabase.rpc('resumen_dashboard', { dias });
    if (e) return setError(mensajeError(e));
    setDatos(data);
  };
  useEffect(() => { cargar(); }, [dias]);

  const periodo = (
    <div class="segmentado" role="group" aria-label="Período">
      {PERIODOS.map(([d, t]) => (
        <button key={d} type="button" aria-pressed={dias === d ? 'true' : 'false'} onClick={() => setDias(d)}>{t}</button>
      ))}
    </div>
  );

  if (error) return <><Cabecera titulo="Resumen" acciones={periodo} /><Aviso tono="error" titulo="No se pudo cargar el resumen" acciones={<Boton chico onClick={cargar}>Reintentar</Boton>}>{error}</Aviso></>;
  if (!datos) return <><Cabecera titulo="Resumen" acciones={periodo} /><Cargando /></>;

  const d = datos;
  const tasa = d.consultas_total ? Math.round((d.convertidas / d.consultas_total) * 100) : null;
  const hayMedicion = Boolean(d.primer_evento);
  const maxTop = Math.max(1, ...d.top_servicios.map((t) => t.n));

  return (
    <>
      <Cabecera titulo="Resumen" descripcion={`Últimos ${dias} días. Todo sale de las consultas del cotizador y de la medición propia de la web.`} acciones={periodo} />

      <div class="kpis">
        <Kpi etiqueta="Consultas recibidas" valor={d.consultas_total} detalle={`${d.consultas_historico} desde el inicio`} href="#/consultas" />
        <Kpi etiqueta="Nuevas sin atender" valor={d.nuevas} detalle={`${d.pendientes} pendientes en total`} tono={d.nuevas ? 'acento' : ''} href="#/consultas?estado=nueva" />
        <Kpi etiqueta="Presupuestos enviados" valor={d.presupuestos_enviados} detalle="Consultas del período" />
        <Kpi etiqueta="Convertidas en clientes" valor={d.convertidas} detalle={tasa == null ? 'Sin consultas todavía' : `${tasa} % de las consultas`} />
        <Kpi etiqueta="Visitas a la web" valor={hayMedicion ? d.visitas : '—'} detalle={hayMedicion ? `${d.visitantes} visitantes únicos por día` : 'Todavía no hay visitas medidas'} />
        <Kpi etiqueta="Clics en WhatsApp" valor={hayMedicion ? d.clics_whatsapp : '—'} detalle={hayMedicion ? 'Botones y cotizador' : 'Se mide desde la primera visita'} />
      </div>

      <div class="grilla-resumen">
        <Tarjeta titulo="Evolución de consultas" descripcion="Por día, con las visitas como referencia." class="col-2">
          {d.consultas_total === 0 && !hayMedicion ? (
            <Vacio icono="resumen" titulo="Todavía no hay datos para graficar" texto="Cuando alguien use el cotizador o visite la web, vas a ver la evolución acá." />
          ) : (
            <Grafico dias={d.por_dia} />
          )}
        </Tarjeta>

        <Tarjeta titulo="Lo más consultado" descripcion="Paquete o servicio elegido en el cotizador.">
          {d.top_servicios.length === 0 ? (
            <Vacio icono="cotizador" titulo="Sin consultas en este período" />
          ) : (
            <ul class="barras">
              {d.top_servicios.map((t) => (
                <li key={t.nombre}>
                  <span class="barras-nombre">{t.nombre}<small>{t.tipo === 'paquete' ? 'Paquete' : 'Servicio'}</small></span>
                  <span class="barras-pista"><i style={{ width: `${(t.n / maxTop) * 100}%` }} /></span>
                  <strong>{t.n}</strong>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Actividad reciente" acciones={<a class="link" href="#/consultas">Ver consultas</a>}>
          {d.actividad.length === 0 ? (
            <Vacio icono="consultas" titulo="Sin actividad todavía" texto="Las consultas nuevas y los cambios de estado aparecen acá." />
          ) : (
            <ul class="actividad">
              {d.actividad.map((a, i) => (
                <li key={i}>
                  <span class={`actividad-punto actividad-${a.tipo}`} aria-hidden="true" />
                  <a href={`#/consultas/${a.consulta_id}`}>
                    <strong>{a.tipo === 'creada' ? 'Nueva consulta' : a.tipo === 'estado' ? 'Cambio de estado' : 'Nota agregada'}</strong>
                    <span>
                      {a.nombre || 'Sin nombre'} · {a.principal || '—'} · <span class="dato">{a.codigo}</span>
                      {a.tipo === 'estado' && a.detalle ? ` · ${a.detalle.split(' → ').map((x) => NOMBRE_ESTADO[x] ?? x).join(' → ')}` : ''}
                    </span>
                  </a>
                  <time>{haceCuanto(a.creado_en)}</time>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Clics en WhatsApp por lugar" descripcion="Desde qué parte de la web escriben.">
          {d.whatsapp_por_lugar.length === 0 ? (
            <Vacio icono="whatsapp" titulo="Sin clics medidos en este período" />
          ) : (
            <ul class="lista-simple">
              {d.whatsapp_por_lugar.map((w) => <li key={w.lugar}><span>{w.lugar}</span><strong>{w.n}</strong></li>)}
            </ul>
          )}
          <p class="nota-chica"><Icono n="info" tam={14} /> Medición propia, sin cookies ni datos personales.</p>
        </Tarjeta>
      </div>
    </>
  );
}
