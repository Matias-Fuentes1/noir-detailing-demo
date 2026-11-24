// Servicios: tarjetas del bento de la web. El precio "Desde" de la tarjeta es independiente
// del precio que usa el cotizador para el servicio suelto (se edita abajo, en el mismo diálogo).
import { Cabecera, Tarjeta, Texto, Numero, Fila, CampoImagen, Interruptor, BarraGuardar, useEditor, Aviso, formatoPesos } from '../ui.jsx';
import { ListaEditable, requerido, precioValido, limpiar } from '../lista.jsx';
import { TituloSeccion } from './inicio.jsx';
import { nuevoId, slug } from '../../js/contenido.js';

const nuevo = () => ({ id: nuevoId('servicio'), nombre: '', linea: '', tiempo: '', precio: 0, precioCotizador: 0, enCotizador: true, dias: 0, pintura: false, foto: null, fotoAlt: '', destacado: false, activo: true });

function Formulario({ item, set, errores }) {
  return (
    <>
      <Fila>
        <Texto etiqueta="Nombre" valor={item.nombre} onCambio={(v) => set('nombre', v)} error={errores.nombre} max={40} autoFocus />
        <Texto etiqueta="Duración estimada" valor={item.tiempo} onCambio={(v) => set('tiempo', v)} placeholder="Ej.: 2 h, 1–2 días" max={16} ayuda="Se muestra en la tarjeta." />
      </Fila>
      <Texto etiqueta="Descripción" valor={item.linea} onCambio={(v) => set('linea', v)} multilinea filas={2} max={120} error={errores.linea} />
      <Numero etiqueta="Precio de referencia (“Desde”)" valor={item.precio} onCambio={(v) => set('precio', v)} prefijo="$" paso={1000} error={errores.precio} ayuda="Solo para la tarjeta. No cambia el cotizador." />
      <CampoImagen etiqueta="Foto" valor={item.foto} onCambio={(v) => set('foto', v)} alt={item.fotoAlt} onAlt={(v) => set('fotoAlt', v)} carpeta="servicios" />
      <Interruptor etiqueta="Destacado" ayuda="Ocupa la tarjeta grande. Solo puede haber uno." valor={item.destacado} onCambio={(v) => set('destacado', v)} />
      <Interruptor etiqueta="Visible en la web" valor={item.activo} onCambio={(v) => set('activo', v)} />
      <fieldset class="sub-bloque">
        <legend>En el cotizador</legend>
        <Interruptor etiqueta="Ofrecer como servicio suelto" valor={item.enCotizador} onCambio={(v) => set('enCotizador', v)} />
        {item.enCotizador && (
          <>
            <Fila>
              <Numero etiqueta="Precio base del cotizador" valor={item.precioCotizador} onCambio={(v) => set('precioCotizador', v)} prefijo="$" paso={1000} error={errores.precioCotizador} ayuda="Para un auto chico; se multiplica según el tamaño." />
              <Numero etiqueta="Días en el taller" valor={item.dias} onCambio={(v) => set('dias', v)} paso={0.5} ayuda="0 = en el día." />
            </Fila>
            <Interruptor etiqueta="Trabaja la pintura" ayuda="Si está activo, suma el recargo por estado de la pintura." valor={item.pintura} onCambio={(v) => set('pintura', v)} />
          </>
        )}
      </fieldset>
    </>
  );
}

const validar = (s) => limpiar({ nombre: requerido(s.nombre), precio: precioValido(s.precio), precioCotizador: s.enCotizador ? precioValido(s.precioCotizador) : undefined });

export function Servicios() {
  const ed = useEditor(['servicios', 'secciones']);
  const servicios = ed.valor.servicios;
  const cambiar = (lista) => {
    // Un solo destacado: si se marcó uno nuevo, se desmarca el anterior.
    const antes = new Set(servicios.filter((s) => s.destacado).map((s) => s.id));
    const nuevoDest = lista.find((s) => s.destacado && !antes.has(s.id));
    ed.set('servicios', nuevoDest ? lista.map((s) => ({ ...s, destacado: s.id === nuevoDest.id })) : lista);
  };
  const validarTodo = ({ servicios: l }) => {
    const ids = new Set();
    for (const s of l) {
      if (!s.nombre.trim()) return 'Hay un servicio sin nombre.';
      const id = s.id || slug(s.nombre);
      if (ids.has(id)) return `Hay dos servicios con el mismo identificador (${id}).`;
      ids.add(id);
    }
    return '';
  };
  return (
    <>
      <Cabecera titulo="Servicios" descripcion="Las tarjetas de la sección Servicios. El orden de la lista es el orden en la web." />
      <Aviso tono="info">El <strong>precio “Desde”</strong> se muestra en la tarjeta. El <strong>precio del cotizador</strong> es otro campo (abajo, en cada servicio, o en Cotizador → Servicios sueltos): cambiar uno no toca el otro.</Aviso>
      <Tarjeta titulo="Lista de servicios">
        <ListaEditable
          items={servicios}
          onCambio={cambiar}
          nuevo={nuevo}
          etiqueta="servicio"
          titulo={(s) => s.nombre}
          subtitulo={(s) => `Desde ${formatoPesos(s.precio)} · ${s.tiempo || 'sin duración'}${s.enCotizador ? ` · Cotizador: ${formatoPesos(s.precioCotizador)}` : ''}`}
          foto={(s) => s.foto}
          insignias={(s) => [s.destacado && ['Destacado', 'acento'], !s.enCotizador && ['Fuera del cotizador', 'neutro']]}
          campoVisible="activo"
          Formulario={Formulario}
          validar={validar}
        />
      </Tarjeta>
      <TituloSeccion ed={ed} clave="servicios" conTexto />
      <BarraGuardar editor={ed} validar={validarTodo} />
    </>
  );
}
