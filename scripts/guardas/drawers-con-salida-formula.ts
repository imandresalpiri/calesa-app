// Los `<Drawer>` del área de la fórmula (4.20-3b): parte del registro de `DRAWERS` (`drawers-con-salida.ts`), que los suma tras los del
// núcleo.
import type { RegistroDeDrawer } from './drawers-con-salida'

export const DRAWERS_DE_LA_FORMULA: Record<string, RegistroDeDrawer> = {
  // «Versiones» de la barra de la fórmula (`?panel=versiones`).
  'src/modules/cotizaciones/features/formula/components/versiones/drawer-de-las-versiones.tsx': {
    sinFormulario:
      'la lista de versiones de la fórmula: sólo se lee; «Revertir» abre su confirmación',
  },
  // El ⚙ de una constante en la hoja (4.20-3b): lo tipeado no tiene borrador, así que el cuerpo (una sola llamada para todo el panel) pide `preguntaAlCerrar`.
  'src/modules/cotizaciones/features/formula/components/hoja/panel-del-ajuste.tsx': {
    formulario: 'src/modules/cotizaciones/features/formula/components/hoja/cuerpo-del-ajuste.tsx',
    mecanismo: 'contexto',
  },
  // El ⚙ de la cabecera: lo elegido no tiene borrador; el cuerpo pide `preguntaAlCerrar` y su pie es `<PieDelPanel>`.
  'src/modules/cotizaciones/features/formula/components/hoja/panel-del-ajuste-de-la-cabecera.tsx': {
    formulario:
      'src/modules/cotizaciones/features/formula/components/hoja/cuerpo-del-ajuste-de-la-cabecera.tsx',
    mecanismo: 'contexto',
  },
  // Los paneles de la planilla (D20): cada formulario pide `preguntaAlCerrar` y su pie es `<PieDelPanel>`.
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-de-la-banda.tsx': {
    formulario:
      'src/modules/cotizaciones/features/formula/components/planilla/comunes/formulario-del-grupo.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-del-total.tsx': {
    formulario:
      'src/modules/cotizaciones/features/formula/components/planilla/paneles/formulario-del-total.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-del-tipo-de-celda.tsx':
    {
      formulario:
        'src/modules/cotizaciones/features/formula/components/planilla/paneles/marco-del-tipo.tsx',
      mecanismo: 'contexto',
    },
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-de-decimales.tsx': {
    formulario:
      'src/modules/cotizaciones/features/formula/components/planilla/paneles/formulario-de-decimales.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-como-se-escribe.tsx':
    {
      sinFormulario: 'La ayuda de cómo se escribe una fórmula: sólo lectura.',
    },
  // Los paneles al costado de la planilla (`?costado=`): «Totales» y la tarjeta en vivo sólo se leen.
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-de-los-totales.tsx':
    {
      sinFormulario: 'los totales con la unidad de ejemplo: sólo se leen',
    },
  'src/modules/cotizaciones/features/formula/components/planilla/paneles/panel-de-la-tarjeta.tsx': {
    sinFormulario: 'la tarjeta en vivo: sólo se lee; elegir el modo no escribe nada',
  },
}
