// Cotizador: calcula en vivo y termina en WhatsApp con el resumen armado.
import { calcular, pesos, mensajePresupuesto, linkWhatsApp } from './calculo.js';

export function abrirWhatsApp(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
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
    resumen.dataset.tamano = r.tamano.id;
    linea.textContent = `${r.tamano.nombre} · ${r.principal.nombre} · ${r.estado.nombre}`;
    const i = Number(estado.value);
    estado.setAttribute('aria-valuetext', estados[i].nombre);
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
    abrirWhatsApp(linkWhatsApp(negocio, mensajePresupuesto(negocio, ultimo ?? calcular(negocio, leer()), nombre)));
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
