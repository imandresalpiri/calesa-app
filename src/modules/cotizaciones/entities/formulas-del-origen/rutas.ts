// Los nombres que la barra de la fórmula escribe en la URL: los paneles (`?panel=`, con `usePanelPorUrl()`) y sus claves. Las rutas, en `@/shared/lib/rutas`
// (`rutaDeLaFormula()`).

export const PANEL_NUEVA_FORMULA = 'nueva-formula'
// Los cuatro de una fórmula: nombran la suya en `CLAVE_DE_LA_FORMULA_DEL_PANEL`.
export const PANEL_RENOMBRAR_FORMULA = 'renombrar-formula'
export const PANEL_ACTIVAR_FORMULA = 'activar-formula'
export const PANEL_ARCHIVAR_FORMULA = 'archivar-formula'
export const PANEL_ELIMINAR_FORMULA = 'eliminar-formula'

// La fórmula que nombra un panel (`&cual=<id>`): no es `formula`, que es la elegida en la barra (`usePanelPorUrl` borra sus claves al cerrar).
export const CLAVE_DE_LA_FORMULA_DEL_PANEL = 'cual'
// La fórmula de la que se copia (`?panel=nueva-formula&copia=<id>`).
export const CLAVE_DE_LA_COPIA = 'copia'
// Cómo empieza la fórmula nueva que abre la puesta en marcha (`?panel=nueva-formula&como=blanco|otro`).
export const CLAVE_DEL_COMO = 'como'
export const COMO_DESDE_LA_URL = ['blanco', 'otro'] as const
