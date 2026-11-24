import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './admin.css';
import { configurado, supabase, mensajeError } from './supabase.js';
import { iniciarSesion, entrar, salir, useEstado, publicar, descartarBorrador, token, cargarContenido } from './store.js';
import { ProveedorToasts, Confirmaciones, Icono, Boton, Cargando, Aviso, Modal, Texto, useToast, confirmar, haceCuanto } from './ui.jsx';
import { RUTAS, MENU } from './rutas.jsx';
import { VistaPrevia } from './preview.jsx';

// ---------------------------------------------------------------- router (por hash: /admin/#/servicios)
function useRuta() {
  const leer = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const [ruta, setRuta] = useState(leer);
  useEffect(() => {
    let anterior = location.hash;
    const cambio = () => {
      // Si hay cambios sin guardar, se pregunta antes de salir de la pantalla.
      if (window.__cambiosSinGuardar && !window.__saltarAviso) {
        const destino = location.hash;
        history.replaceState(null, '', anterior);
        confirmar({ titulo: 'Tenés cambios sin guardar', texto: 'Si salís de esta pantalla, se pierden.', aceptar: 'Salir sin guardar', peligro: true }).then((ok) => {
          if (!ok) return;
          window.__cambiosSinGuardar = false;
          location.hash = destino;
        });
        return;
      }
      anterior = location.hash;
      setRuta(leer());
      document.querySelector('.contenido-principal')?.scrollTo?.(0, 0);
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', cambio);
    return () => removeEventListener('hashchange', cambio);
  }, []);
  return ruta;
}

// ---------------------------------------------------------------- login
function Login() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recuperar, setRecuperar] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Escribí un email válido.');
    setCargando(true);
    try {
      if (recuperar) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/` });
        if (err) throw new Error(mensajeError(err));
        setEnviado(true);
      } else {
        if (!clave) throw new Error('Escribí tu contraseña.');
        await entrar(email.trim(), clave);
        if (!location.hash || location.hash === '#/login') location.hash = '#/';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div class="login">
      <form class="login-caja" onSubmit={enviar} noValidate>
        <div class="login-marca"><span class="marca-logo">NOIR</span><span>Panel de administración</span></div>
        <h1>{recuperar ? 'Recuperar contraseña' : 'Iniciar sesión'}</h1>
        {enviado ? (
          <Aviso tono="ok" titulo="Revisá tu email">Si la cuenta existe, te mandamos un link para crear una contraseña nueva.</Aviso>
        ) : (
          <>
            <div class="campo">
              <label for="login-email">Email</label>
              <input id="login-email" type="email" autocomplete="username" value={email} onInput={(e) => setEmail(e.currentTarget.value)} required autoFocus />
            </div>
            {!recuperar && (
              <div class="campo">
                <label for="login-clave">Contraseña</label>
                <input id="login-clave" type="password" autocomplete="current-password" value={clave} onInput={(e) => setClave(e.currentTarget.value)} required />
              </div>
            )}
            {error && <p class="login-error" role="alert">{error}</p>}
            <Boton variante="primario" type="submit" cargando={cargando} class="boton-ancho">{recuperar ? 'Mandarme el link' : 'Entrar'}</Boton>
          </>
        )}
        <button type="button" class="link" onClick={() => { setRecuperar(!recuperar); setError(''); setEnviado(false); }}>
          {recuperar ? 'Volver a iniciar sesión' : 'Me olvidé la contraseña'}
        </button>
      </form>
      <p class="login-pie">Acceso solo para el equipo del local.</p>
    </div>
  );
}

function NuevaClave() {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const toast = useToast();
  const enviar = async (e) => {
    e.preventDefault();
    if (clave.length < 10) return setError('Usá al menos 10 caracteres.');
    setCargando(true);
    const { error: err } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);
    if (err) return setError(mensajeError(err));
    toast('Contraseña actualizada.');
    location.hash = '#/';
  };
  return (
    <div class="login">
      <form class="login-caja" onSubmit={enviar} noValidate>
        <div class="login-marca"><span class="marca-logo">NOIR</span><span>Panel de administración</span></div>
        <h1>Contraseña nueva</h1>
        <div class="campo">
          <label for="nueva-clave">Contraseña nueva</label>
          <input id="nueva-clave" type="password" autocomplete="new-password" value={clave} onInput={(e) => setClave(e.currentTarget.value)} />
          <p class="campo-msj">Mínimo 10 caracteres. Mejor una frase que una palabra.</p>
        </div>
        {error && <p class="login-error" role="alert">{error}</p>}
        <Boton variante="primario" type="submit" cargando={cargando} class="boton-ancho">Guardar contraseña</Boton>
      </form>
    </div>
  );
}

function BarraSuperior({ onMenu }) {
  const s = useEstado();
  const toast = useToast();
  const [publicando, setPublicando] = useState(false);
  const [preview, setPreview] = useState(false);

  const alPublicar = async () => {
    if (window.__cambiosSinGuardar) return toast('Primero guardá (o descartá) los cambios de esta pantalla.', 'error');
    const ok = await confirmar({ titulo: 'Publicar los cambios', texto: 'Los cambios del borrador se van a ver en la web pública en menos de un minuto.', aceptar: 'Publicar' });
    if (!ok) return;
    setPublicando(true);
    try {
      await publicar();
      toast('¡Publicado! La web se actualiza en menos de un minuto.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPublicando(false);
    }
  };
  const alDescartar = async () => {
    const ok = await confirmar({ titulo: 'Descartar el borrador', texto: 'El borrador vuelve a quedar igual a lo que está publicado. Se pierden los cambios guardados que no publicaste.', aceptar: 'Descartar cambios', peligro: true });
    if (!ok) return;
    try {
      await descartarBorrador();
      toast('Borrador descartado.');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <header class="barra-superior">
      <button type="button" class="icono-btn solo-movil" aria-label="Abrir menú" onClick={onMenu}><Icono n="menu" /></button>
      <div class="estado-publicacion">
        {s.hayCambiosSinPublicar ? (
          <>
            <span class="punto punto-borrador" aria-hidden="true" />
            <span><strong>Cambios sin publicar</strong><small>Borrador guardado {s.borradorFecha ? haceCuanto(s.borradorFecha) : ''}</small></span>
          </>
        ) : (
          <>
            <span class="punto punto-ok" aria-hidden="true" />
            <span><strong>Todo publicado</strong><small>{s.publicadoFecha ? `Última publicación ${haceCuanto(s.publicadoFecha)}` : ''}</small></span>
          </>
        )}
      </div>
      <div class="barra-acciones">
        {s.hayCambiosSinPublicar && s.publicado && <Boton variante="fantasma" chico onClick={alDescartar} class="oculto-movil">Descartar</Boton>}
        <Boton chico icono="ojo" onClick={() => setPreview(true)}>Vista previa</Boton>
        <Boton chico variante="primario" icono="check" cargando={publicando} disabled={!s.hayCambiosSinPublicar} onClick={alPublicar}>Publicar</Boton>
        <a class="boton boton-fantasma boton-chico oculto-movil" href={`/?v=${Date.now()}`} target="_blank" rel="noopener"><Icono n="externo" /><span>Ver la web</span></a>
      </div>
      {preview && <VistaPrevia onCerrar={() => setPreview(false)} />}
    </header>
  );
}

function Lateral({ ruta, abierto, onCerrar }) {
  const s = useEstado();
  return (
    <>
      <nav class={`lateral${abierto ? ' lateral-abierto' : ''}`} aria-label="Secciones del panel">
        <div class="lateral-marca">
          <span class="marca-logo">{s.borrador?.nombreCorto || 'NOIR'}</span>
          <span class="lateral-sub">Panel</span>
        </div>
        <div class="lateral-scroll">
          {MENU.map((grupo) => (
            <div class="lateral-grupo" key={grupo.titulo}>
              {grupo.titulo && <p class="lateral-titulo">{grupo.titulo}</p>}
              {grupo.items.map(([href, texto, icono]) => {
                const activo = ruta === href || (href !== '/' && ruta.startsWith(`${href}/`));
                return (
                  <a key={href} href={`#${href}`} class={`lateral-link${activo ? ' activo' : ''}`} aria-current={activo ? 'page' : undefined} onClick={onCerrar}>
                    <Icono n={icono} />
                    <span>{texto}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        <div class="lateral-pie">
          <span class="lateral-usuario" title={s.usuario?.email}>{s.usuario?.email}</span>
          <button type="button" class="icono-btn" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={salir}><Icono n="salir" /></button>
        </div>
      </nav>
      {abierto && <div class="lateral-fondo" onClick={onCerrar} aria-hidden="true" />}
    </>
  );
}

function Panel() {
  const s = useEstado();
  const ruta = useRuta();
  const [menu, setMenu] = useState(false);

  if (ruta === '/nueva-clave') return <NuevaClave />;
  if (s.cargandoSesion) return <div class="pantalla-centro"><Cargando texto="Abriendo el panel…" /></div>;
  if (!s.sesion || !s.esAdmin) return <Login />;

  const coincidencia = RUTAS.find((r) => r.patron.test(ruta));
  const Pagina = coincidencia?.componente;
  const params = coincidencia ? ruta.match(coincidencia.patron).slice(1) : [];

  return (
    <div class="app">
      <Lateral ruta={ruta} abierto={menu} onCerrar={() => setMenu(false)} />
      <div class="app-cuerpo">
        <BarraSuperior onMenu={() => setMenu(true)} />
        <main class="contenido-principal" id="principal">
          {s.borrador?.demo?.activo && (
            <Aviso tono="demo" titulo="Datos de demostración">
              El número de WhatsApp, la dirección, Instagram, los precios, las opiniones y las fotos de trabajos son de ejemplo. Reemplazalos antes de usar la web con clientes reales y, después, apagá el modo demo en <a href="#/negocio">Datos del negocio</a>.
            </Aviso>
          )}
          {s.errorContenido ? (
            <Aviso tono="error" titulo="No se pudo cargar el contenido" acciones={<Boton chico onClick={cargarContenido}>Reintentar</Boton>}>{s.errorContenido}</Aviso>
          ) : !s.borrador ? (
            <Cargando texto="Cargando el contenido…" />
          ) : Pagina ? (
            <Pagina key={ruta} params={params} />
          ) : (
            <Aviso tono="error" titulo="Esta pantalla no existe"><a href="#/">Volver al resumen</a></Aviso>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => { iniciarSesion(); }, []);
  if (!configurado) {
    return (
      <div class="pantalla-centro">
        <Aviso tono="error" titulo="Falta configurar Supabase">
          Definí <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (ver <code>.env.example</code> y docs/ADMIN.md) y volvé a desplegar.
        </Aviso>
      </div>
    );
  }
  return (
    <ProveedorToasts>
      <Panel />
      <Confirmaciones />
    </ProveedorToasts>
  );
}

render(<App />, document.getElementById('app'));
