// Toda lista de un módulo (una tabla de registros, o la que elige entre tabla y tarjetas por el ancho) usa el patrón de lista de
// `@/shared/ui/lista` (`.claude/rules/ui.md`, 9i): una sola vista elegida en el servidor, el nombre y el «⋯» pegados, un clic en
// cualquier parte de la fila abre su resumen o su ficha y con el teclado se alcanza el nombre. `scripts/guardas/listas-con-patron.test.ts` falla
// si un archivo de `src/modules` dibuja una tabla (`<Table…>`, `<table>`) o usa `CORTE_DE_LA_TABLA` sin importar el patrón y sin figurar
// acá con su motivo. Un archivo que ya lo usa no puede figurar: la excepción se saca cuando deja de serlo.
export const LISTAS_SIN_PATRON: Record<string, string> = {
  'src/modules/equipo/features/roles/components/matriz-de-roles.tsx':
    'es una matriz de permisos (roles contra permisos), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/equipo/features/roles/components/fila-ancha-de-la-matriz.tsx':
    'es una fila de la matriz de permisos que ocupa todo el ancho (el renglón de «Todos», la cabeza y el pie de los niveles), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/equipo/features/roles/components/grupo-matriz.tsx':
    'es un bloque de la matriz de permisos (roles contra permisos de un módulo), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/equipo/features/roles/components/niveles-del-grupo.tsx':
    'son las filas de los niveles de acceso dentro de la matriz de permisos (el «⋯» de cada nivel va en su primera fila), no una lista de registros: no tiene resumen por fila',
  'src/modules/equipo/features/roles/components/quien-crea-y-quien-ve/quien-crea-y-quien-ve.tsx':
    'es el cuadro «Quién crea y quién ve» (roles contra tres permisos de cotizaciones), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/equipo/features/roles/components/quien-crea-y-quien-ve/tabla-del-cuadro.tsx':
    'es el cuadro «Quién crea y quién ve» desde 768 px (un renglón por rol con sus controles), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/cotizaciones/features/hoja/components/tabla-de-la-ayuda.tsx':
    'es una tabla de referencia de sólo lectura en un panel, no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/cotizaciones/features/aprobada/components/comparar/tabla-de-comparar.tsx':
    'es la comparación lado a lado de 2 o 3 cotizaciones (una columna por cotización, una fila por nodo), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/cotizaciones/features/formula/components/planilla/cuadricula/tabla-de-la-cuadricula.tsx':
    'es la cuadrícula de la planilla de la fórmula (`role="grid"`: las filas de un grafo con sus columnas A a D, como una hoja de cálculo), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/repuestos/features/items/components/fila-del-item.tsx':
    'es la fila de UN ítem como una hoja de cálculo (sus ocho celdas editables) dentro del drawer del ítem o de «Agregar ítems», no una lista de registros: la lista son las tarjetas, que sí usan el patrón',
  'src/modules/tablero/features/metricas/graficas/tabla-equivalente.tsx':
    'es la tabla de «Ver como tabla» de una gráfica (los mismos números, de sólo lectura), no una lista de registros: no tiene resumen ni «⋯» por fila',
}
