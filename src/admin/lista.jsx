// Lista editable genérica (servicios, trabajos, opiniones, preguntas…):
// ordenar, mostrar/ocultar, editar en un diálogo, agregar y eliminar con confirmación.
// Los cambios quedan en la pantalla hasta tocar "Guardar" en la barra de abajo.
import { useState } from 'preact/hooks';
import { Boton, IconoBoton, Icono, Insignia, Modal, Vacio, confirmar, mover } from './ui.jsx';
import { urlFoto } from './imagenes.js';

export function ListaEditable({
  items,
  onCambio,
  nuevo,                 // () => item vacío
  etiqueta = 'ítem',     // "servicio", "trabajo"…
  titulo,                // (item) => texto principal
  subtitulo,             // (item) => texto secundario
  foto,                  // (item) => foto (opcional)
  insignias,             // (item) => [[texto, tono]]
  campoVisible,          // 'activo' | 'visible' | 'activa' (opcional)
  Formulario,            // ({ item, set, errores }) => JSX
  validar,               // (item, items) => { campo: 'mensaje' } | null
  minimo = 0,
  vacio,
  agregarTexto,
  grilla = false,
}) {
  const [editando, setEditando] = useState(null); // { indice, item, errores }

  const abrir = (indice) => setEditando({ indice, item: structuredClone(indice < 0 ? nuevo() : items[indice]), errores: {} });
  const aplicar = () => {
    const errores = validar?.(editando.item, items, editando.indice) ?? {};
    if (Object.keys(errores).length) return setEditando({ ...editando, errores });
    onCambio(editando.indice < 0 ? [...items, editando.item] : items.map((x, i) => (i === editando.indice ? editando.item : x)));
    setEditando(null);
  };
  const eliminar = async (i) => {
    if (items.length <= minimo) return;
    const ok = await confirmar({ titulo: `Eliminar ${etiqueta}`, texto: `"${titulo(items[i]) || 'Sin nombre'}" se va a borrar del borrador. Podés deshacerlo con "Descartar" antes de guardar.`, aceptar: 'Eliminar', peligro: true });
    if (ok) onCambio(items.filter((_, j) => j !== i));
  };
  const set = (k, v) => setEditando((e) => ({ ...e, item: { ...e.item, [k]: v }, errores: { ...e.errores, [k]: undefined } }));

  return (
    <div class="lista-editable">
      {items.length === 0 ? (
        vacio ?? <Vacio titulo={`Todavía no hay ${etiqueta}s`} texto={`Agregá el primero con el botón de abajo.`} />
      ) : (
        <ul class={grilla ? 'items-grilla' : 'items'}>
          {items.map((item, i) => {
            const oculto = campoVisible && item[campoVisible] === false;
            const f = foto?.(item);
            return (
              <li key={item.id ?? i} class={`item${oculto ? ' item-oculto' : ''}`}>
                {foto && (
                  <button type="button" class="item-foto" onClick={() => abrir(i)} aria-label={`Editar ${titulo(item)}`}>
                    {f ? <img src={urlFoto(f)} alt="" loading="lazy" /> : <span><Icono n="galeria" /></span>}
                  </button>
                )}
                <div class="item-texto">
                  <button type="button" class="item-titulo" onClick={() => abrir(i)}>{titulo(item) || <em>Sin nombre</em>}</button>
                  {subtitulo && <span class="item-sub">{subtitulo(item)}</span>}
                  <span class="item-insignias">
                    {oculto && <Insignia tono="neutro">Oculto</Insignia>}
                    {insignias?.(item)?.filter(Boolean).map(([t, tono]) => <Insignia key={t} tono={tono}>{t}</Insignia>)}
                  </span>
                </div>
                <div class="item-acciones">
                  {campoVisible && (
                    <IconoBoton icono={oculto ? 'ojoNo' : 'ojo'} etiqueta={oculto ? 'Mostrar en la web' : 'Ocultar de la web'} onClick={() => onCambio(items.map((x, j) => (j === i ? { ...x, [campoVisible]: !(x[campoVisible] !== false) } : x)))} />
                  )}
                  <IconoBoton icono="arriba" etiqueta="Subir" disabled={i === 0} onClick={() => onCambio(mover(items, i, -1))} />
                  <IconoBoton icono="abajo" etiqueta="Bajar" disabled={i === items.length - 1} onClick={() => onCambio(mover(items, i, 1))} />
                  <IconoBoton icono="editar" etiqueta="Editar" onClick={() => abrir(i)} />
                  <IconoBoton icono="basura" etiqueta="Eliminar" disabled={items.length <= minimo} onClick={() => eliminar(i)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Boton icono="mas" onClick={() => abrir(-1)} class="lista-agregar">{agregarTexto ?? `Agregar ${etiqueta}`}</Boton>

      {editando && (
        <Modal titulo={editando.indice < 0 ? `Nuevo ${etiqueta}` : `Editar ${etiqueta}`} onCerrar={() => setEditando(null)}>
          <form
            class="form-modal"
            onSubmit={(e) => { e.preventDefault(); aplicar(); }}
            noValidate
          >
            <Formulario item={editando.item} set={set} errores={editando.errores} />
            <div class="modal-acciones">
              <Boton variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Boton>
              <Boton variante="primario" type="submit" icono="check">{editando.indice < 0 ? 'Agregar' : 'Listo'}</Boton>
            </div>
            <p class="form-nota">Después tocá <strong>Guardar</strong> en la barra de abajo para no perderlo.</p>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Validaciones comunes
export const requerido = (v, msj = 'Completá este campo.') => (String(v ?? '').trim() ? undefined : msj);
export const precioValido = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0 ? 'Poné un precio válido (0 o más).' : undefined);
export const urlValida = (v) => (!v || /^https?:\/\/\S+\.\S+/.test(v) ? undefined : 'Tiene que empezar con https://');
export const limpiar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
