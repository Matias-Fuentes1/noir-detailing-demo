// Promociones: se muestran en la web solo si están activas y dentro de sus fechas.
import { Cabecera, Tarjeta, Texto, Numero, Fila, CampoImagen, Interruptor, Seleccion, BarraGuardar, useEditor, Campo, formatoPesos } from '../ui.jsx';
import { ListaEditable, requerido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId, promoVigente } from '../../js/contenido.js';
import { opcionesPrincipales } from '../../js/calculo.js';
import { useEstado } from '../store.js';

const nuevo = () => ({ id: nuevoId('promo'), titulo: '', descripcion: '', foto: null, fotoAlt: '', precio: null, precioAnterior: null, desde: new Date().toISOString().slice(0, 10), hasta: '', activa: true, preset: '' });

export function estadoPromo(p) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!p.activa) return ['Inactiva', 'neutro'];
  if (p.hasta && hoy > p.hasta) return ['Vencida', 'neutro'];
  if (p.desde && hoy < p.desde) return ['Programada', 'info'];
  return ['En la web', 'ok'];
}

function Fecha({ etiqueta, valor, onCambio, error }) {
  const id = `f-${etiqueta}`;
  return (
    <Campo etiqueta={etiqueta} id={id} error={error} opcional>
      <input id={id} type="date" value={valor} onInput={(e) => onCambio(e.currentTarget.value)} />
    </Campo>
  );
}

function Formulario({ item, set, errores }) {
  const s = useEstado();
  const opciones = [['', 'WhatsApp (pedir cotización)'], ...opcionesPrincipales(s.borrador).map((o) => [o.id, `Cotizador con “${o.nombre}” elegido`])];
  return (
    <>
      <Texto etiqueta="Título" valor={item.titulo} onCambio={(v) => set('titulo', v)} error={errores.titulo} max={48} autoFocus />
      <Texto etiqueta="Descripción" valor={item.descripcion} onCambio={(v) => set('descripcion', v)} multilinea filas={3} max={220} opcional />
      <CampoImagen etiqueta="Imagen" valor={item.foto} onCambio={(v) => set('foto', v)} alt={item.fotoAlt} onAlt={(v) => set('fotoAlt', v)} carpeta="promociones" />
      <Fila>
        <Numero etiqueta="Precio promocional" valor={item.precio ?? ''} onCambio={(v) => set('precio', v === '' ? null : v)} prefijo="$" paso={1000} ayuda="Opcional." error={errores.precio} />
        <Numero etiqueta="Precio anterior (tachado)" valor={item.precioAnterior ?? ''} onCambio={(v) => set('precioAnterior', v === '' ? null : v)} prefijo="$" paso={1000} ayuda="Opcional." />
      </Fila>
      <Fila>
        <Fecha etiqueta="Desde" valor={item.desde} onCambio={(v) => set('desde', v)} />
        <Fecha etiqueta="Hasta" valor={item.hasta} onCambio={(v) => set('hasta', v)} error={errores.hasta} />
      </Fila>
      <Seleccion etiqueta="El botón lleva a" valor={item.preset} onCambio={(v) => set('preset', v)} opciones={opciones} />
      <Interruptor etiqueta="Activa" valor={item.activa} onCambio={(v) => set('activa', v)} />
    </>
  );
}

const validar = (p) =>
  limpiar({
    titulo: requerido(p.titulo),
    hasta: p.desde && p.hasta && p.hasta < p.desde ? 'La fecha de fin es anterior a la de inicio.' : undefined,
    precio: p.precio != null && p.precioAnterior != null && p.precio >= p.precioAnterior ? 'El precio promocional debería ser menor que el anterior.' : undefined,
  });

export function Promociones() {
  const ed = useEditor(['promociones', 'secciones']);
  const vigentes = ed.valor.promociones.filter((p) => promoVigente(p)).length;
  return (
    <>
      <Cabecera titulo="Promociones" descripcion={`La sección aparece en la web solo cuando hay alguna promoción vigente. Ahora: ${vigentes} en la web.`} />
      <Tarjeta titulo="Promociones">
        <ListaEditable
          items={ed.valor.promociones}
          onCambio={(l) => ed.set('promociones', l)}
          nuevo={nuevo}
          etiqueta="promoción"
          agregarTexto="Agregar promoción"
          titulo={(p) => p.titulo}
          subtitulo={(p) => [p.precio != null && formatoPesos(p.precio), p.desde && `desde ${p.desde.split('-').reverse().join('/')}`, p.hasta && `hasta ${p.hasta.split('-').reverse().join('/')}`].filter(Boolean).join(' · ') || 'Sin fechas'}
          foto={(p) => p.foto}
          insignias={(p) => [estadoPromo(p)]}
          Formulario={Formulario}
          validar={validar}
        />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="promociones" conTexto />
      <BarraGuardar editor={ed} />
    </>
  );
}
