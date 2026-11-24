// Componentes de interfaz del panel: botones, campos, tarjetas, avisos, diálogos y el editor de borrador.
import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'preact/hooks';
import { estado, guardarBorrador, useEstado } from './store.js';
import { subirFoto, subirIcono, urlFoto } from './imagenes.js';

// ---------------------------------------------------------------- íconos (trazo 1.75, 20 px)
const P = {
  resumen: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  consultas: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  inicio: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  servicios: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  galeria: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  comparar: 'M12 3v18M4 6h5v12H4zM15 6h5v12h-5z',
  proceso: 'M5 4v16M5 6h3M5 12h3M5 18h3M11 6h8M11 12h8M11 18h8',
  opiniones: 'M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z',
  preguntas: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 18h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  promos: 'M4 12V4h8l8 8-8 8zM8 8h.01',
  cotizador: 'M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01',
  negocio: 'M4 20V8l8-4 8 4v12M9 20v-6h6v6M4 20h16',
  seo: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  historial: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2',
  textos: 'M4 6h16M4 12h10M4 18h7',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  mas: 'M12 5v14M5 12h14',
  basura: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  arriba: 'M12 19V5M6 11l6-6 6 6',
  abajo: 'M12 5v14M6 13l6 6 6-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ojoNo: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.6 6.6C3.8 8.4 2 12 2 12s4 6 10 6c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cerrar: 'M6 6l12 12M18 6L6 18',
  whatsapp: 'M4.5 19.5l1.1-3.9A8 8 0 1 1 8.6 18.6zM9 8.6c.2-.5.6-.6 1-.5l.6 1.4c.1.3 0 .6-.2.8l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.8-.2l1.4.6c.1.4 0 .8-.5 1-1.8.9-6-2.7-5.4-5.4z',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  subir: 'M12 16V4M6 10l6-6 6 6M4 20h16',
  menu: 'M4 7h16M4 12h16M4 17h16',
  estrella: 'M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z',
  aviso: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  descargar: 'M12 4v12M6 10l6 6 6-6M4 20h16',
  copiar: 'M8 8h12v12H8zM4 16V4h12',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  arrastrar: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
};
export function Icono({ n, tam = 18, ...rest }) {
  return (
    <svg class="ico" viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...rest}>
      <path d={P[n] ?? ''} />
    </svg>
  );
}

// ---------------------------------------------------------------- avisos (toasts)
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ProveedorToasts({ children }) {
  const [lista, setLista] = useState([]);
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), tipo === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div class="toasts" role="status" aria-live="polite">
        {lista.map((t) => (
          <div key={t.id} class={`toast toast-${t.tipo}`}>
            <Icono n={t.tipo === 'error' ? 'aviso' : 'check'} />
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------- diálogos
let abrirConfirmacion = null;
export function confirmar(opciones) {
  return new Promise((ok) => abrirConfirmacion?.({ ...opciones, ok }));
}
export function Confirmaciones() {
  const [c, setC] = useState(null);
  abrirConfirmacion = setC;
  if (!c) return null;
  const cerrar = (v) => { c.ok(v); setC(null); };
  return (
    <Modal titulo={c.titulo} onCerrar={() => cerrar(false)} chico>
      <p class="modal-texto">{c.texto}</p>
      <div class="modal-acciones">
        <Boton variante="fantasma" onClick={() => cerrar(false)}>{c.cancelar ?? 'Cancelar'}</Boton>
        <Boton variante={c.peligro ? 'peligro' : 'primario'} onClick={() => cerrar(true)} autoFocus>{c.aceptar ?? 'Aceptar'}</Boton>
      </div>
    </Modal>
  );
}

export function Modal({ titulo, children, onCerrar, chico, ancho }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const esc = (e) => { e.preventDefault(); onCerrar?.(); };
    d.addEventListener('cancel', esc);
    return () => d.removeEventListener('cancel', esc);
  }, []);
  return (
    <dialog ref={ref} class={`modal${chico ? ' modal-chico' : ''}${ancho ? ' modal-ancho' : ''}`} aria-label={titulo} onClick={(e) => e.target === ref.current && onCerrar?.()}>
      <div class="modal-caja">
        <header class="modal-head">
          <h2>{titulo}</h2>
          <button type="button" class="icono-btn" aria-label="Cerrar" onClick={onCerrar}><Icono n="cerrar" /></button>
        </header>
        <div class="modal-cuerpo">{children}</div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------- básicos
export function Boton({ variante = 'secundario', icono, cargando, children, class: clase = '', chico, ...rest }) {
  return (
    <button type="button" class={`boton boton-${variante}${chico ? ' boton-chico' : ''} ${clase}`} disabled={cargando || rest.disabled} aria-busy={cargando ? 'true' : undefined} {...rest}>
      {cargando ? <span class="spinner" aria-hidden="true" /> : icono ? <Icono n={icono} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconoBoton({ icono, etiqueta, ...rest }) {
  return (
    <button type="button" class="icono-btn" aria-label={etiqueta} title={etiqueta} {...rest}>
      <Icono n={icono} />
    </button>
  );
}

export function Tarjeta({ titulo, descripcion, acciones, children, class: clase = '' }) {
  return (
    <section class={`tarjeta ${clase}`}>
      {(titulo || acciones) && (
        <header class="tarjeta-head">
          <div>
            {titulo && <h2 class="tarjeta-titulo">{titulo}</h2>}
            {descripcion && <p class="tarjeta-desc">{descripcion}</p>}
          </div>
          {acciones && <div class="tarjeta-acciones">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Cabecera({ titulo, descripcion, acciones }) {
  return (
    <header class="pagina-head">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {acciones && <div class="pagina-acciones">{acciones}</div>}
    </header>
  );
}

export function Insignia({ tono = 'neutro', children }) {
  return <span class={`insignia insignia-${tono}`}>{children}</span>;
}

export function Aviso({ tono = 'info', titulo, children, acciones }) {
  return (
    <div class={`aviso aviso-${tono}`} role={tono === 'error' ? 'alert' : undefined}>
      <Icono n={tono === 'info' ? 'info' : 'aviso'} />
      <div>
        {titulo && <strong>{titulo}</strong>}
        {children && <div>{children}</div>}
      </div>
      {acciones && <div class="aviso-acciones">{acciones}</div>}
    </div>
  );
}

export function Vacio({ icono = 'info', titulo, texto, children }) {
  return (
    <div class="vacio">
      <span class="vacio-icono"><Icono n={icono} tam={22} /></span>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div class="cargando" role="status">
      <span class="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

// ---------------------------------------------------------------- campos
let contadorIds = 0;
const useId = (pref) => useMemo(() => `${pref}-${++contadorIds}`, []);

export function Campo({ etiqueta, ayuda, error, children, opcional, class: clase = '', id }) {
  return (
    <div class={`campo ${error ? 'campo-error' : ''} ${clase}`}>
      {etiqueta && (
        <label for={id}>
          {etiqueta}
          {opcional && <span class="opcional"> (opcional)</span>}
        </label>
      )}
      {children}
      {error ? <p class="campo-msj campo-msj-error" id={`${id}-msj`}>{error}</p> : ayuda ? <p class="campo-msj" id={`${id}-msj`}>{ayuda}</p> : null}
    </div>
  );
}

export function Texto({ etiqueta, valor, onCambio, ayuda, error, opcional, multilinea, filas = 3, max, class: clase, ...rest }) {
  const id = useId('t');
  const props = {
    id,
    value: valor ?? '',
    onInput: (e) => onCambio(e.currentTarget.value),
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error || ayuda ? `${id}-msj` : undefined,
    maxLength: max,
    ...rest,
  };
  return (
    <Campo etiqueta={etiqueta} ayuda={max && !error ? `${ayuda ? `${ayuda} · ` : ''}${(valor ?? '').length}/${max}` : ayuda} error={error} opcional={opcional} id={id} class={clase}>
      {multilinea ? <textarea rows={filas} {...props} /> : <input type="text" {...props} />}
    </Campo>
  );
}

export function Numero({ etiqueta, valor, onCambio, ayuda, error, prefijo, sufijo, min = 0, paso = 1, class: clase, ...rest }) {
  const id = useId('n');
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} error={error} id={id} class={clase}>
      <div class="input-grupo">
        {prefijo && <span class="input-afijo">{prefijo}</span>}
        <input
          id={id}
          type="number"
          inputmode="decimal"
          min={min}
          step={paso}
          value={valor ?? ''}
          aria-invalid={error ? 'true' : undefined}
          onInput={(e) => onCambio(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
          {...rest}
        />
        {sufijo && <span class="input-afijo">{sufijo}</span>}
      </div>
    </Campo>
  );
}

export function Seleccion({ etiqueta, valor, onCambio, opciones, ayuda, class: clase }) {
  const id = useId('s');
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda} id={id} class={clase}>
      <select id={id} value={valor} onChange={(e) => onCambio(e.currentTarget.value)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Campo>
  );
}

export function Interruptor({ etiqueta, valor, onCambio, ayuda }) {
  const id = useId('i');
  return (
    <div class="interruptor-fila">
      <button type="button" role="switch" id={id} aria-checked={valor ? 'true' : 'false'} class="interruptor" onClick={() => onCambio(!valor)}>
        <span />
      </button>
      <label for={id}>
        <span>{etiqueta}</span>
        {ayuda && <small>{ayuda}</small>}
      </label>
    </div>
  );
}

export function Fila({ children, cols = 2 }) {
  return <div class={`fila fila-${cols}`}>{children}</div>;
}

// Lista de textos cortos (ej.: qué incluye un paquete).
export function ListaTextos({ etiqueta, valores, onCambio, placeholder = 'Nuevo ítem', ayuda }) {
  return (
    <Campo etiqueta={etiqueta} ayuda={ayuda}>
      <div class="lista-textos">
        {valores.map((v, i) => (
          <div class="lista-textos-fila" key={i}>
            <input type="text" value={v} aria-label={`${etiqueta} ${i + 1}`} onInput={(e) => onCambio(valores.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
            <IconoBoton icono="arriba" etiqueta="Subir" disabled={i === 0} onClick={() => onCambio(mover(valores, i, -1))} />
            <IconoBoton icono="basura" etiqueta="Quitar" onClick={() => onCambio(valores.filter((_, j) => j !== i))} />
          </div>
        ))}
        <Boton chico variante="fantasma" icono="mas" onClick={() => onCambio([...valores, ''])}>{placeholder}</Boton>
      </div>
    </Campo>
  );
}

// ---------------------------------------------------------------- imágenes
export function CampoImagen({ etiqueta, valor, onCambio, alt, onAlt, carpeta = 'fotos', ayuda, icono = false, formato, quitable = true }) {
  const toast = useToast();
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef();
  const [arrastrando, setArrastrando] = useState(false);
  const elegir = async (archivo) => {
    if (!archivo) return;
    setSubiendo(true);
    try {
      const foto = icono ? await subirIcono(archivo) : await subirFoto(archivo, carpeta, formato ? { formato } : undefined);
      onCambio(foto);
      toast('Imagen subida. Guardá los cambios para usarla.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };
  const url = urlFoto(valor);
  return (
    <div class="campo campo-imagen">
      {etiqueta && <span class="campo-etiqueta">{etiqueta}</span>}
      <div
        class={`imagen-zona${arrastrando ? ' imagen-zona-activa' : ''}${icono ? ' imagen-zona-icono' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }}
      >
        {url ? <img src={url} alt="" /> : <span class="imagen-vacia"><Icono n="galeria" tam={22} />Sin imagen</span>}
        {subiendo && <span class="imagen-subiendo"><span class="spinner" />Subiendo…</span>}
      </div>
      <div class="imagen-acciones">
        <Boton chico icono="subir" onClick={() => input.current.click()} disabled={subiendo}>{valor ? 'Cambiar' : 'Subir imagen'}</Boton>
        {valor && quitable && <Boton chico variante="fantasma" onClick={() => onCambio(null)}>Quitar</Boton>}
        <input ref={input} type="file" accept={icono ? 'image/png,image/svg+xml,image/x-icon' : 'image/jpeg,image/png,image/webp'} hidden onChange={(e) => elegir(e.currentTarget.files[0])} />
      </div>
      {ayuda && <p class="campo-msj">{ayuda}</p>}
      {onAlt && <Texto etiqueta="Texto alternativo" valor={alt} onCambio={onAlt} ayuda="Describí lo que se ve. Lo leen los lectores de pantalla y Google." max={160} />}
    </div>
  );
}

// ---------------------------------------------------------------- listas ordenables
export const mover = (lista, i, delta) => {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
};

// ---------------------------------------------------------------- editor del borrador
// Copia local de algunas claves del borrador. Detecta cambios, guarda, descarta y avisa al salir.
export function useEditor(claves) {
  const s = useEstado();
  const tomar = () => Object.fromEntries(claves.map((k) => [k, structuredClone(estado.borrador?.[k])]));
  const [valor, setValor] = useState(tomar);
  const [original, setOriginal] = useState(tomar);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  // Si el borrador cambia desde afuera (otra pantalla, restaurar versión) y acá no hay cambios, se actualiza.
  useEffect(() => {
    if (JSON.stringify(valor) === JSON.stringify(original)) {
      const nuevo = tomar();
      setValor(nuevo);
      setOriginal(structuredClone(nuevo));
    }
  }, [s.borrador]);

  const sucio = JSON.stringify(valor) !== JSON.stringify(original);
  useEffect(() => {
    window.__cambiosSinGuardar = sucio;
    const aviso = (e) => { if (sucio) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', aviso);
    return () => { removeEventListener('beforeunload', aviso); window.__cambiosSinGuardar = false; };
  }, [sucio]);

  const set = (k, v) => setValor((x) => ({ ...x, [k]: typeof v === 'function' ? v(x[k]) : v }));

  const guardar = async (validar) => {
    const error = validar?.(valor);
    if (error) { toast(error, 'error'); return false; }
    setGuardando(true);
    try {
      const cambios = {};
      for (const k of claves) {
        if (JSON.stringify(valor[k]) === JSON.stringify(original[k])) continue;
        // 'secciones' es compartido: se fusiona solo lo que cambió sobre la versión más reciente.
        cambios[k] = k === 'secciones' ? { ...estado.borrador.secciones, ...Object.fromEntries(Object.entries(valor.secciones).filter(([sk, sv]) => JSON.stringify(sv) !== JSON.stringify(original.secciones?.[sk]))) } : valor[k];
      }
      await guardarBorrador(cambios);
      setOriginal(structuredClone(valor));
      toast('Cambios guardados en el borrador. Publicá para verlos en la web.');
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    } finally {
      setGuardando(false);
    }
  };
  const descartar = () => setValor(structuredClone(original));
  return { valor, set, setValor, sucio, guardar, descartar, guardando };
}

// Barra fija de "cambios sin guardar".
export function BarraGuardar({ editor, validar }) {
  if (!editor.sucio && !editor.guardando) return null;
  return (
    <div class="barra-guardar" role="region" aria-label="Cambios sin guardar">
      <span><span class="punto" aria-hidden="true" />Tenés cambios sin guardar</span>
      <div>
        <Boton variante="fantasma" onClick={editor.descartar} disabled={editor.guardando}>Descartar</Boton>
        <Boton variante="primario" icono="check" cargando={editor.guardando} onClick={() => editor.guardar(validar)}>Guardar</Boton>
      </div>
    </div>
  );
}

export const formatoPesos = (n) => `$${new Intl.NumberFormat('es-AR').format(Math.round(Number(n) || 0))}`;
export const formatoFecha = (f, conHora = true) =>
  f ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(f)) : '—';
export function haceCuanto(f) {
  const s = (Date.now() - new Date(f)) / 1000;
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
  return formatoFecha(f, false);
}
