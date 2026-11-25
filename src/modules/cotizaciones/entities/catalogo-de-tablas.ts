// El catálogo de tablas de un origen: las activas del origen y las compartidas, una por clave. Si una del origen y una compartida tienen la misma
// clave manda la del origen, la misma que congela la publicación (`params.tablas`) y la que lee `cotizacion_tabla()`: si no, el compilador o el
// editor de la hoja revisarían una tabla y la cotización usaría otra. Lo usan dos áreas: `formula` (lo que BUSCARV puede nombrar al compilar) y
// `diseno` (la tabla de un bloque de la ayuda, sus columnas y su enlace al drawer de tablas).
import type { TablaDelCatalogo } from './compilador-nombres'

// Como la lista de tablas del área `tablas` (que el núcleo no importa): decenas de filas de configuración.
export const TOPE_DE_TABLAS_DEL_CATALOGO = 100

export type ColumnaDelCatalogo = { clave: string; etiqueta: string; tipo: string }

export type TablaDelCatalogoDelOrigen = {
  id: string
  clave: string
  nombre: string
  compartida: boolean
  columnas: readonly ColumnaDelCatalogo[]
}

// Una por clave, la del origen antes que la compartida, en el orden en que llegaron.
export function catalogoDe(
  tablas: readonly TablaDelCatalogoDelOrigen[],
): TablaDelCatalogoDelOrigen[] {
  const propias = new Set(tablas.filter((t) => !t.compartida).map((t) => t.clave))
  const vistas = new Set<string>()
  const catalogo: TablaDelCatalogoDelOrigen[] = []
  for (const t of tablas) {
    if (vistas.has(t.clave) || (t.compartida && propias.has(t.clave))) continue
    vistas.add(t.clave)
    catalogo.push(t)
  }
  return catalogo
}

// Lo que el compilador necesita de cada tabla (`ContextoDeCompilacion.tablas`): la clave y las claves de sus columnas. Nulo si no se leyó.
export const tablasParaElCompilador = (
  catalogo: readonly TablaDelCatalogoDelOrigen[] | null,
): TablaDelCatalogo[] | null =>
  catalogo === null
    ? null
    : catalogo.map((t) => ({ clave: t.clave, columnas: t.columnas.map((c) => c.clave) }))
