// Parte del registro de `<Drawer>`: las tablas de referencia de cotizaciones. La guarda (`drawers-con-salida.ts`) suma esta parte a `DRAWERS` con
// `import.meta.glob('./areas-*/drawers-con-salida.ts')` (`registros-de-carriles.ts`).
import type { RegistroDeDrawer } from '../drawers-con-salida'

export const REGISTRO: Record<string, RegistroDeDrawer> = {
  // `?panel=tablas` sobre Planilla, Hoja o Tarjeta: la lista y el editor de una tabla, cuyo trabajo queda en su borrador de la pestaña del navegador.
  'src/modules/cotizaciones/features/tablas/components/drawer-de-las-tablas.tsx': {
    sinFormulario:
      'es el marco de la lista y del editor de tablas; lo editado en una tabla queda en su borrador de la pestaña del navegador, así que cerrar no pierde nada',
  },
  // `?panel=nueva-tabla` (en el drawer, `&accion=nueva-tabla`): el nombre, para quién y las columnas.
  'src/modules/cotizaciones/features/tablas/components/panel-de-nueva-tabla.tsx': {
    formulario: 'src/modules/cotizaciones/features/tablas/components/panel-de-nueva-tabla.tsx',
    mecanismo: 'contexto',
  },
  // `?tabla=<id>&panel=columnas-de-tabla`: renombrar, sumar, ordenar y quitar columnas.
  'src/modules/cotizaciones/features/tablas/components/panel-de-columnas.tsx': {
    formulario: 'src/modules/cotizaciones/features/tablas/components/panel-de-columnas.tsx',
    mecanismo: 'contexto',
  },
}
