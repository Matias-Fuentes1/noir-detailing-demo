// Cotizador: calcula en vivo y termina en WhatsApp con el resumen armado.
// Antes de abrir WhatsApp, la solicitud se manda a /api/consultas (queda en el panel). El envío es
// "keepalive": no se espera la respuesta, así WhatsApp abre al instante y ningún bloqueador lo frena.
import { calcular, pesos, mensajePresupuesto, linkWhatsApp } from './calculo.js';

// Código corto y legible para cruzar el chat de WhatsApp con la consulta del panel (sin 0/O ni 1/I).
export function nuevoCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const azar = crypto.getRandomValues(new Uint8Array(6));
  return `N-${[...azar].map((b) => letras[b % letras.length]).join('')}`;
}

export function registrarConsulta(datos) {
  if (document.querySelector('.aviso-preview')) return; // la vista previa del panel no genera consultas
  try {
    fetch('/api/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sin red o sin API: WhatsApp abre igual */
  }
}

export function abrirWhatsApp(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.dataset.lugar = 'cotizador'; // para la medición de clics en WhatsApp
  document.body.append(a);
  a.click();
  a.remove();
}

export function iniciarCotizador(negocio, { reducido }) {
  const form = document.getElementById('cotizador-form');
  if (!form) return { preseleccionar() {} };
  const total = document.getElementById('cot-total');
  const barraTotal = document.getElementById('barra-total');
  const desglose = document.getElementById('cot-desglose');
  const tiempo = document.getElementById('cot-tiempo');
  const estado = document.getElementById('estado');
  const estadoNota = document.getElementById('estado-nota');
  const marcas = [...form.querySelectorAll('.estado-marcas span')];
  const estados = negocio.cotizador.estados;
  const resumen = document.getElementById('cot-resumen');
  const linea = document.getElementById('cot-linea');

  let mostrado = 0;
  let anim = 0;
  let ultimo = null;

  const leer = () => ({
    tamano: form.querySelector('input[name=tamano]:checked')?.value,
    principal: form.querySelector('input[name=principal]:checked')?.value,
    estado: Number(estado.value),
    extras: [...form.querySelectorAll('input[name=extras]:checked')].map((i) => i.value),
  });

  function contar(destino) {
    cancelAnimationFrame(anim);
    const desde = mostrado;
    if (reducido || desde === 0 || desde === destino) {
      mostrado = destino;
      total.textContent = barraTotal.textContent = pesos(destino);
      return;
    }
    const inicio = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - inicio) / 200);
      const e = 1 - (1 - k) ** 3;
      mostrado = Math.round(desde + (destino - desde) * e);
      total.textContent = barraTotal.textContent = pesos(mostrado);
      if (k < 1) anim = requestAnimationFrame(paso);
      else mostrado = destino;
    };
    anim = requestAnimationFrame(paso);
  }

  function actualizar() {
    const r = calcular(negocio, leer());
    ultimo = r;
    contar(r.total);
    desglose.replaceChildren(
      ...r.desglose.map((d) => {
        const fila = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = d.concepto;
        dd.textContent = pesos(d.monto);
        dd.className = 'dato';
        fila.append(dt, dd);
        return fila;
      }),
    );
    tiempo.textContent = r.tiempo;
    resumen.dataset.tamano = r.tamano.silueta ?? r.tamano.id;
    linea.textContent = `${r.tamano.nombre} · ${r.principal.nombre} · ${r.estado.nombre}`;
    const i = Number(estado.value);
    estado.setAttribute('aria-valuetext', estados[i]?.nombre ?? '');
    marcas.forEach((m, j) => m.classList.toggle('activo', j === i));
    estadoNota.textContent = r.aplicaEstado ? 'Cuantas más marcas, más trabajo de pulido.' : 'No cambia el precio de este servicio.';
  }

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  // Las etiquetas del slider de estado también se pueden tocar.
  marcas.forEach((m) => {
    m.addEventListener('click', () => { estado.value = m.dataset.estado; actualizar(); });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = form.querySelector('#cot-nombre').value.trim();
    const telefono = form.querySelector('#cot-telefono')?.value.trim() ?? '';
    const trampa = form.querySelector('input[name=web]')?.value ?? '';
    const r = calcular(negocio, leer());
    const codigo = nuevoCodigo();
    const mensaje = mensajePresupuesto(negocio, r, nombre, codigo);
    registrarConsulta({ codigo, nombre, telefono, web: trampa, seleccion: leer(), total: r.total, mensaje });
    abrirWhatsApp(linkWhatsApp(negocio, mensaje));
  });

  mostrado = 0;
  actualizar();

  return {
    preseleccionar(id) {
      const radio = form.querySelector(`input[name=principal][value="${CSS.escape(id)}"]`);
      if (radio) { radio.checked = true; actualizar(); }
    },
  };
}
