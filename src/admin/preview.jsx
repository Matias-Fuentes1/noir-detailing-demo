// Vista previa de la web con el borrador (o con un documento sin guardar / una versión vieja).
import { useEffect, useState } from 'preact/hooks';
import { token } from './store.js';
import { Modal, Aviso, Cargando } from './ui.jsx';

export function VistaPrevia({ doc, onCerrar }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [ancho, setAncho] = useState('escritorio');
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(doc ? { doc } : {}) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Error ${r.status}`);
        setHtml(await r.text());
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);
  return (
    <Modal titulo="Vista previa (sin publicar)" onCerrar={onCerrar} ancho>
      <div class="preview-barra">
        <div class="segmentado" role="group" aria-label="Tamaño de pantalla">
          {[['escritorio', 'Escritorio'], ['tablet', 'Tablet'], ['celular', 'Celular']].map(([k, t]) => (
            <button type="button" key={k} aria-pressed={ancho === k ? 'true' : 'false'} onClick={() => setAncho(k)}>{t}</button>
          ))}
        </div>
        <span class="preview-nota">Así se va a ver la web cuando publiques. Las consultas de esta vista no se guardan.</span>
      </div>
      <div class={`preview-marco preview-${ancho}`}>
        {error ? <Aviso tono="error" titulo="No se pudo generar la vista previa">{error}</Aviso> : html ? <iframe title="Vista previa de la web" srcdoc={html} /> : <Cargando texto="Armando la vista previa…" />}
      </div>
    </Modal>
  );
}

