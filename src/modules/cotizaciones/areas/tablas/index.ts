// La API de servidor del área `tablas` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// `leerTablasDeReferencia(origenId)` (4.23-2): las tablas de referencia activas del origen y las compartidas (una compartida que el origen tapa con una propia va
// `tapada`), con tope de 100 y `hayMas`. `leerTablaParaEditar(tablaId)`: la tabla con su versión y **todas** sus filas en su orden, leídas por cursor; si una fila no se
// lee o hay más de 2.000, no se devuelve (publicarla a medias borraría lo que faltó). Las lee el drawer «Tablas» de la página del origen (4.23-3).
// `leerDondeSeUsaLaTabla(tablaId, candidatos)`: de quién es una tabla y cuáles de los orígenes candidatos tienen una propia con su clave (el 308 de las tablas compartidas).
export { leerDondeSeUsaLaTabla, leerTablaParaEditar, leerTablasDeReferencia } from './composicion'
export type { DondeSeUsaLaTabla } from '../../entities/tablas/lectura'
