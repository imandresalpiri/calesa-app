// Parte del registro de `<Drawer>`: los de la agenda (7.07-2) —el detalle de un evento y de una tarea (sin formulario) y los formularios de alta y edición (con su `<CambiosSinGuardar>`)— y los drawers de embarques y contenedores. La guarda
// (`drawers-con-salida.ts`) suma esta parte a `DRAWERS` con `import.meta.glob('./areas-*/drawers-con-salida.ts')` (`registros-de-carriles.ts`).
import type { RegistroDeDrawer } from '../drawers-con-salida'

export const REGISTRO: Record<string, RegistroDeDrawer> = {
  // «Personalizar» del tablero (9.08-3).
  'src/modules/tablero/features/metricas/personalizar/panel-de-personalizar.tsx': {
    sinFormulario:
      'sólo interruptores y botones de orden que guardan en el acto: no hay nada tipeado que perder',
  },
  'src/modules/agenda/features/eventos/components/panel-de-evento.tsx': {
    sinFormulario:
      'sólo es el detalle de un evento, con «Editar» y «Eliminar»: no guarda nada tipeado; lo que se escribe está en el formulario de edición, que se registra aparte',
  },
  'src/modules/agenda/features/eventos/components/panel-de-formulario-de-evento.tsx': {
    formulario: 'src/modules/agenda/features/eventos/components/panel-de-formulario-de-evento.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/agenda/features/tareas/components/panel-de-tarea.tsx': {
    sinFormulario:
      'sólo es el detalle de una tarea, con «Marcar como hecha», «Editar» y «Eliminar» y el despliegue de reasignar (un selector que pide en el acto, sin guardar nada tipeado): no guarda nada tipeado; lo que se escribe está en el formulario de edición, que se registra aparte',
  },
  'src/modules/agenda/features/recordatorios/components/panel-de-recordatorio.tsx': {
    sinFormulario:
      'sólo es el detalle de un recordatorio, con «Completar» o «Reabrir»: no guarda nada tipeado; el recordatorio se edita desde el lead',
  },
  'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx': {
    formulario: 'src/modules/agenda/features/tareas/components/panel-de-formulario-de-tarea.tsx',
    mecanismo: 'contexto',
  },
  // El drawer de un contenedor de `/logistica/embarques` y de la página de un embarque (`?contenedor=`).
  'src/modules/logistica/features/transporte/components/drawer-del-contenedor.tsx': {
    sinFormulario:
      'sólo es el marco del contenedor (qué es, su embarque y sus vehículos): no guarda nada tipeado; editarlo, agregarle vehículos y sus huecos se abren encima, cada uno con su salida',
  },
  // Un hueco de un embarque o un contenedor (`?panel=grupo-<clave>`): subir un documento a los vehículos, prorratear un gasto.
  'src/modules/logistica/features/transporte/components/drawer-del-hueco.tsx': {
    sinFormulario:
      'sólo es el marco del hueco: lo que cada área escribe en él va en formularios que preguntan por sí solos',
  },
  // «Agregar vehículos» a un embarque o un contenedor (`?panel=agregar-vehiculos`): con alguno elegido, pregunta al cerrar.
  'src/modules/logistica/features/transporte/components/drawer-agregar-vehiculos.tsx': {
    formulario: 'src/modules/logistica/features/transporte/components/drawer-agregar-vehiculos.tsx',
    mecanismo: 'contexto',
  },
  // El panel de la derecha de la página de una guía en una pantalla angosta: `?panel=lateral`. Es sólo el marco; lo escrito vive en la página.
  'src/modules/web/features/contenido/guias/components/panel-en-drawer.tsx': {
    sinFormulario:
      'sólo es el marco del panel de la guía (publicación y opciones del bloque): lo escrito vive en la página de la guía, que guarda su borrador y pregunta al salir (useSalidaConCambios); cerrar el cajón no descarta nada',
  },
  // «Nueva guía» de Configuración › Sitio web › Guías (8.03-1): `?panel=guia-nueva`; el formulario dice que tiene algo escrito.
  'src/modules/web/features/contenido/guias/components/drawer-nueva-guia.tsx': {
    formulario: 'src/modules/web/features/contenido/guias/components/formulario-de-nueva-guia.tsx',
    mecanismo: 'contexto',
  },
  // «Categorías» de Configuración › Sitio web › Guías (8.03-2): `?panel=categorias`; el nombre que se escribe dice que hay algo escrito. El pie es «Listo».
  'src/modules/web/features/contenido/categorias/components/drawer-de-categorias.tsx': {
    formulario:
      'src/modules/web/features/contenido/categorias/components/formulario-de-categoria.tsx',
    mecanismo: 'contexto',
  },
  // El alta y la edición de una pregunta frecuente de Configuración › Sitio web (8.02-1): lo escrito queda en su borrador y pregunta al salir.
  'src/modules/web/features/contenido/faqs/components/panel-de-faq.tsx': {
    formulario: 'src/modules/web/features/contenido/faqs/components/panel-de-faq.tsx',
    mecanismo: 'contexto',
  },
  // El alta y la edición de un testimonio de Configuración › Sitio web (8.02-2): lo escrito queda en su borrador y pregunta al salir.
  'src/modules/web/features/contenido/testimonios/components/panel-de-testimonio.tsx': {
    formulario: 'src/modules/web/features/contenido/testimonios/components/panel-de-testimonio.tsx',
    mecanismo: 'contexto',
  },
  // El «Ver todos» de «Turnos de la web sin confirmar» en Inicio (`?panel=turnos`): sólo lista mis turnos; lo que se hace con uno («Contacté», «Vincular a lead») es de su tarjeta.
  'src/modules/web/features/turnos/panel/components/panel-de-turnos.tsx': {
    sinFormulario: 'sólo lista mis turnos sin confirmar; no guarda nada tipeado',
  },
  // «Registrar consentimiento» de un testimonio (8.02-2): el canal y las casillas escritas quedan en su borrador y preguntan al salir.
  'src/modules/web/features/contenido/testimonios/components/panel-de-consentimiento.tsx': {
    formulario:
      'src/modules/web/features/contenido/testimonios/components/panel-de-consentimiento.tsx',
    mecanismo: 'contexto',
  },
  // «Agregar a la rueda» de Configuración › Cola web (8.04-3): con alguien elegido, pregunta al salir (el aviso «Abrir Roles» sale de la pantalla).
  'src/modules/web/features/cola/rueda/components/panel-agregar-a-la-rueda.tsx': {
    formulario: 'src/modules/web/features/cola/rueda/components/panel-agregar-a-la-rueda.tsx',
    mecanismo: 'contexto',
  },
}
