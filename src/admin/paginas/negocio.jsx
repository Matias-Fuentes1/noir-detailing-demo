// Datos del negocio: nombre, contacto, dirección, horarios, mensajes de WhatsApp y modo demo.
// El número de WhatsApp se usa en TODOS los botones de la web desde este único campo.
import { Cabecera, Tarjeta, Texto, Numero, Fila, Interruptor, BarraGuardar, useEditor, IconoBoton, Boton, Aviso } from '../ui.jsx';
import { useEstado } from '../store.js';
import { TituloSeccion } from './inicio.jsx';

const CLAVES = ['nombre', 'nombreCorto', 'descripcion', 'lema', 'ciudad', 'region', 'whatsapp', 'telefonoVisible', 'telefono', 'email', 'instagram', 'direccion', 'direccionCorta', 'mapsUrl', 'mapa', 'horario', 'horarioCorto', 'mensajes', 'demo', 'secciones'];

export const whatsappValido = (w) => /^549\d{10}$/.test(w) || /x/i.test(w);

function validar(v) {
  if (!v.nombre.trim() || !v.nombreCorto.trim()) return 'Completá el nombre comercial y el nombre corto.';
  if (!whatsappValido(v.whatsapp)) return 'El WhatsApp tiene que tener el formato 549 + característica + número (13 dígitos), ej.: 5492284611455.';
  if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return 'El email no es válido.';
  if (v.instagram.url && !/^https:\/\/\S+/.test(v.instagram.url)) return 'El link de Instagram tiene que empezar con https://';
  if (v.mapsUrl && !/^https:\/\/\S+/.test(v.mapsUrl)) return 'El link de Google Maps tiene que empezar con https://';
  if (!Number.isFinite(Number(v.mapa.lat)) || !Number.isFinite(Number(v.mapa.lng))) return 'Revisá las coordenadas del mapa.';
  if (!v.mensajes.cotizacion.includes('{nombreCorto}') && !v.mensajes.cotizacion.trim()) return 'El mensaje de WhatsApp no puede quedar vacío.';
  return '';
}

export function Negocio() {
  const s = useEstado();
  const ed = useEditor(CLAVES);
  const v = ed.valor;
  const set = (k) => (val) => ed.set(k, val);
  const setObj = (k, sub) => (val) => ed.set(k, (o) => ({ ...o, [sub]: val }));
  const errorWa = v.whatsapp && !whatsappValido(v.whatsapp) ? 'Formato: 549 + característica sin 0 + número sin 15. Ej.: 5492284611455' : undefined;
  const prueba = `https://wa.me/${/x/i.test(v.whatsapp) ? '' : v.whatsapp}?text=${encodeURIComponent((v.mensajes.cotizacion || '').replace('{nombreCorto}', v.nombreCorto))}`;

  return (
    <>
      <Cabecera titulo="Datos del negocio" descripcion="Se usan en toda la web: encabezado, contacto, footer, mapa y mensajes de WhatsApp." />
      {v.demo.activo && (
        <Aviso tono="demo" titulo="Modo demo activo" acciones={<Boton chico onClick={() => ed.set('demo', { ...v.demo, activo: false })}>Apagar modo demo</Boton>}>
          La web muestra “{v.demo.aviso}” en el footer. Apagalo cuando todos los datos sean reales.
        </Aviso>
      )}
      <div class="grilla-form">
        <Tarjeta titulo="Identidad">
          <Fila>
            <Texto etiqueta="Nombre comercial" valor={v.nombre} onCambio={set('nombre')} max={48} />
            <Texto etiqueta="Nombre corto" valor={v.nombreCorto} onCambio={set('nombreCorto')} max={16} ayuda="Logo y saludo del WhatsApp (“Hola NOIR…”)." />
          </Fila>
          <Texto etiqueta="Descripción del negocio" valor={v.descripcion} onCambio={set('descripcion')} multilinea filas={2} max={200} ayuda="Se usa como descripción para Google si no cargás una en SEO." />
          <Fila cols={3}>
            <Texto etiqueta="Lema" valor={v.lema} onCambio={set('lema')} max={40} />
            <Texto etiqueta="Ciudad" valor={v.ciudad} onCambio={set('ciudad')} max={32} />
            <Texto etiqueta="Provincia / región" valor={v.region} onCambio={set('region')} max={24} />
          </Fila>
        </Tarjeta>

        <Tarjeta titulo="Contacto">
          <Fila>
            <Texto etiqueta="Número de WhatsApp" valor={v.whatsapp} onCambio={(x) => ed.set('whatsapp', x.replace(/[^\dXx]/g, ''))} error={errorWa} inputMode="numeric" placeholder="5492284611455" ayuda="Lo usan todos los botones de WhatsApp de la web." />
            <Texto etiqueta="Cómo se muestra" valor={v.telefonoVisible} onCambio={set('telefonoVisible')} max={24} placeholder="2284 61-1455" />
          </Fila>
          <a class="link" href={prueba} target="_blank" rel="noopener">Probar el link de WhatsApp →</a>
          <Fila>
            <Texto etiqueta="Teléfono para llamadas" valor={v.telefono} onCambio={set('telefono')} max={24} opcional />
            <Texto etiqueta="Email" valor={v.email} onCambio={set('email')} type="email" max={80} opcional />
          </Fila>
          <Fila>
            <Texto etiqueta="Instagram (usuario)" valor={v.instagram.usuario} onCambio={setObj('instagram', 'usuario')} placeholder="@tulocal" max={40} />
            <Texto etiqueta="Instagram (link)" valor={v.instagram.url} onCambio={setObj('instagram', 'url')} placeholder="https://www.instagram.com/tulocal" />
          </Fila>
        </Tarjeta>

        <Tarjeta titulo="Dirección y mapa">
          <Fila>
            <Texto etiqueta="Dirección completa" valor={v.direccion} onCambio={set('direccion')} max={90} />
            <Texto etiqueta="Dirección corta" valor={v.direccionCorta} onCambio={set('direccionCorta')} max={40} />
          </Fila>
          <Texto etiqueta="Link de Google Maps" valor={v.mapsUrl} onCambio={set('mapsUrl')} opcional placeholder="https://maps.app.goo.gl/…" ayuda="Para “Cómo llegar”. Si lo dejás vacío, se arma con las coordenadas." />
          <Fila cols={3}>
            <Numero etiqueta="Latitud" valor={v.mapa.lat} onCambio={setObj('mapa', 'lat')} paso={0.0001} min={-90} />
            <Numero etiqueta="Longitud" valor={v.mapa.lng} onCambio={setObj('mapa', 'lng')} paso={0.0001} min={-180} />
            <Numero etiqueta="Zoom" valor={v.mapa.zoom} onCambio={setObj('mapa', 'zoom')} min={10} max={19} />
          </Fila>
          <p class="campo-msj">Para sacar las coordenadas: en Google Maps, tocá el local con el botón derecho y copiá los dos números. <a class="link" href={`https://www.openstreetmap.org/?mlat=${v.mapa.lat}&mlon=${v.mapa.lng}#map=17/${v.mapa.lat}/${v.mapa.lng}`} target="_blank" rel="noopener">Ver el punto actual →</a></p>
        </Tarjeta>

        <Tarjeta titulo="Horarios de atención">
          {v.horario.map((h, i) => (
            <div class="fila fila-datos" key={i}>
              <Texto etiqueta="Días" valor={h.dias} onCambio={(x) => ed.set('horario', v.horario.map((y, j) => (j === i ? { ...y, dias: x } : y)))} max={32} />
              <Texto etiqueta="Horario" valor={h.horas} onCambio={(x) => ed.set('horario', v.horario.map((y, j) => (j === i ? { ...y, horas: x } : y)))} max={40} />
              <IconoBoton icono="basura" etiqueta="Quitar" onClick={() => ed.set('horario', v.horario.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Boton chico icono="mas" onClick={() => ed.set('horario', [...v.horario, { dias: '', horas: '' }])}>Agregar horario</Boton>
          <Texto etiqueta="Horario resumido (footer)" valor={v.horarioCorto} onCambio={set('horarioCorto')} max={80} />
        </Tarjeta>

        <Tarjeta titulo="Mensajes de WhatsApp" descripcion="Lo que aparece escrito cuando el cliente abre el chat. {nombreCorto} y {servicio} se reemplazan solos.">
          <Texto etiqueta="Pedir cotización (botones generales)" valor={v.mensajes.cotizacion} onCambio={setObj('mensajes', 'cotizacion')} multilinea filas={2} max={200} />
          <Texto etiqueta="Pedir un servicio puntual" valor={v.mensajes.servicio} onCambio={setObj('mensajes', 'servicio')} multilinea filas={2} max={200} />
        </Tarjeta>

        <TituloSeccion ed={ed} clave="contacto" conTexto />

        <Tarjeta titulo="Modo demo">
          <Interruptor etiqueta="Mostrar que es una demo" ayuda="Agrega el aviso en el footer y en el panel." valor={v.demo.activo} onCambio={(x) => ed.set('demo', { ...v.demo, activo: x })} />
          <Texto etiqueta="Texto del aviso" valor={v.demo.aviso} onCambio={(x) => ed.set('demo', { ...v.demo, aviso: x })} max={80} />
        </Tarjeta>
      </div>
      {s.borrador && <BarraGuardar editor={ed} validar={validar} />}
    </>
  );
}
