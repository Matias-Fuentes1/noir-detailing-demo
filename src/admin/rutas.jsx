// Mapa del panel: menú lateral y pantallas. Para sumar un módulo nuevo:
// 1) creá la pantalla en paginas/, 2) agregala a RUTAS y 3) al MENU.
import { Resumen } from './paginas/resumen.jsx';
import { Consultas, DetalleConsulta } from './paginas/consultas.jsx';
import { Inicio } from './paginas/inicio.jsx';
import { Servicios } from './paginas/servicios.jsx';
import { Galeria } from './paginas/galeria.jsx';
import { AntesDespues } from './paginas/antes-despues.jsx';
import { Proceso } from './paginas/proceso.jsx';
import { Opiniones } from './paginas/opiniones.jsx';
import { Preguntas } from './paginas/preguntas.jsx';
import { Promociones } from './paginas/promociones.jsx';
import { Demos } from './paginas/demos.jsx';
import { Cotizador } from './paginas/cotizador.jsx';
import { Negocio } from './paginas/negocio.jsx';
import { Seo } from './paginas/seo.jsx';
import { Historial } from './paginas/historial.jsx';

export const RUTAS = [
  { patron: /^\/$/, componente: Resumen },
  { patron: /^\/consultas$/, componente: Consultas },
  { patron: /^\/consultas\/([\w-]+)$/, componente: DetalleConsulta },
  { patron: /^\/inicio$/, componente: Inicio },
  { patron: /^\/servicios$/, componente: Servicios },
  { patron: /^\/promociones$/, componente: Promociones },
  { patron: /^\/galeria$/, componente: Galeria },
  { patron: /^\/antes-despues$/, componente: AntesDespues },
  { patron: /^\/proceso$/, componente: Proceso },
  { patron: /^\/opiniones$/, componente: Opiniones },
  { patron: /^\/preguntas$/, componente: Preguntas },
  { patron: /^\/demos$/, componente: Demos },
  { patron: /^\/cotizador$/, componente: Cotizador },
  { patron: /^\/negocio$/, componente: Negocio },
  { patron: /^\/seo$/, componente: Seo },
  { patron: /^\/historial$/, componente: Historial },
];

export const MENU = [
  { titulo: '', items: [['/', 'Resumen', 'resumen'], ['/consultas', 'Consultas', 'consultas']] },
  {
    titulo: 'Contenido',
    items: [
      ['/inicio', 'Inicio', 'inicio'],
      ['/servicios', 'Servicios', 'servicios'],
      ['/promociones', 'Promociones', 'promos'],
      ['/galeria', 'Galería de trabajos', 'galeria'],
      ['/antes-despues', 'Antes y después', 'comparar'],
      ['/proceso', 'Proceso', 'proceso'],
      ['/opiniones', 'Opiniones', 'opiniones'],
      ['/preguntas', 'Preguntas frecuentes', 'preguntas'],
      ['/demos', 'Pulido y cerámico', 'textos'],
    ],
  },
  { titulo: 'Ventas', items: [['/cotizador', 'Cotizador', 'cotizador']] },
  { titulo: 'Configuración', items: [['/negocio', 'Datos del negocio', 'negocio'], ['/seo', 'SEO y secciones', 'seo'], ['/historial', 'Publicaciones', 'historial']] },
];
