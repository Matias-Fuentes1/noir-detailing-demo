// Publicaciones: las últimas 30 versiones publicadas, con opción de volver el borrador a una de ellas.
import { useEffect, useState } from 'preact/hooks';
import { supabase, mensajeError } from '../supabase.js';
import { cargarContenido, useEstado } from '../store.js';
import { Cabecera, Tarjeta, Cargando, Aviso, Vacio, Boton, Insignia, useToast, confirmar, formatoFecha, haceCuanto } from '../ui.jsx';
import { VistaPrevia } from '../preview.jsx';

export function Historial() {
  const s = useEstado();
  const toast = useToast();
  const [versiones, setVersiones] = useState(null);
  const [error, setError] = useState('');
  const [verDoc, setVerDoc] = useState(null);

  const cargar = async () => {
    const { data, error: e } = await supabase.from('contenido_versiones').select('id, publicado_en, nota, doc').order('id', { ascending: false }).limit(30);
    if (e) return setError(mensajeError(e));
    setVersiones(data);
  };
  useEffect(() => { cargar(); }, [s.publicadoFecha]);

  const restaurar = async (v) => {
    const ok = await confirmar({ titulo: 'Volver a esta versión', texto: `El borrador va a quedar igual a lo publicado el ${formatoFecha(v.publicado_en)}. Después revisalo y tocá Publicar. Lo que tengas sin publicar se pierde.`, aceptar: 'Restaurar en el borrador' });
    if (!ok) return;
    const { error: e } = await supabase.rpc('restaurar_version', { version_id: v.id });
    if (e) return toast(mensajeError(e), 'error');
    await cargarContenido();
    toast('Borrador restaurado. Revisalo y publicá cuando quieras.');
  };

  return (
    <>
      <Cabecera titulo="Publicaciones" descripcion="Cada vez que publicás se guarda una copia. Podés volver a cualquiera de las últimas 30." />
      {error ? <Aviso tono="error" titulo="No se pudo cargar el historial">{error}</Aviso> : !versiones ? <Cargando /> : versiones.length === 0 ? (
        <Tarjeta><Vacio icono="historial" titulo="Todavía no publicaste cambios" texto="La primera publicación aparece acá." /></Tarjeta>
      ) : (
        <Tarjeta>
          <ul class="versiones">
            {versiones.map((v, i) => (
              <li key={v.id}>
                <div>
                  <strong>{formatoFecha(v.publicado_en)}</strong>
                  <span>{haceCuanto(v.publicado_en)}{v.nota ? ` · ${v.nota}` : ''}</span>
                </div>
                {i === 0 && <Insignia tono="ok">En la web</Insignia>}
                <div class="acciones-derecha">
                  <Boton chico variante="fantasma" icono="ojo" onClick={() => setVerDoc(v.doc)}>Ver</Boton>
                  {i > 0 && <Boton chico onClick={() => restaurar(v)}>Restaurar</Boton>}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      {verDoc && <VistaPrevia doc={verDoc} onCerrar={() => setVerDoc(null)} />}
    </>
  );
}
