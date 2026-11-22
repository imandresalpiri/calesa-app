// Composición del área `tablas` de `cotizaciones` en el servidor (4.15-4; la llena el 4.23-2). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeTablas } from '../../entities/tablas/repositorio'
import {
  getDondeSeUsaLaTabla,
  getTablaParaEditar,
  getTablasDeReferencia,
  tablasSupabase,
} from '../../infra/tablas/servidor'

// Las tablas activas de un origen y las compartidas, con tope (`hayMas`).
export const leerTablasDeReferencia = getTablasDeReferencia
// De quién es una tabla y qué orígenes tienen una propia con su clave (el 308 de `/configuracion/catalogos/tablas`).
export const leerDondeSeUsaLaTabla = getDondeSeUsaLaTabla
// Una tabla con todas sus filas para editarla, o por qué no se edita (no está, no se ve, pasa de 2.000 filas).
export const leerTablaParaEditar = getTablaParaEditar
// Publicar, crear, cambiar las columnas y desactivar una tabla de referencia, cada una por su RPC (`tabla_referencia_publicar|crear|columnas|desactivar`). Las
// actions de `features/tablas/` lo usan.
export const repositorioDeTablas: RepositorioDeTablas = tablasSupabase
