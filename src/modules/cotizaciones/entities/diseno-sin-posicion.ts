// Las piezas del diseño de la hoja antes de tener su lugar en la rejilla (docs/GLOSARIO.md › «Posición (en la rejilla)»), y la conversión con su tipo.
import { disenoEnRejilla } from './diseno-en-rejilla'
import type { Diseno, ItemDeDiseno, SeccionDeDiseno } from './diseno'
import type { Posicion } from './rejilla-de-la-hoja'

// Una pieza antes de tener lugar: la que ofrece «Sumar» (`primerLugarLibre()` le da su posición al sumarla) y la de un diseño de flujo que aún no se
// leyó (las pruebas lo escriben así y `esquemaDiseno` o `enRejilla()` lo convierten).
type SinPosicion<T> = T extends { posicion: Posicion }
  ? Omit<T, 'posicion'> & { posicion?: Posicion }
  : T
export type ItemSinPosicion = SinPosicion<ItemDeDiseno>
export type SeccionSinPosicion = Omit<SeccionDeDiseno, 'posicion' | 'items'> & {
  posicion?: Posicion
  items: ItemSinPosicion[]
}
export type DisenoSinPosicion = Omit<Diseno, 'secciones'> & { secciones: SeccionSinPosicion[] }

// Un diseño (de flujo o ya en rejilla) en rejilla, sin validarlo: la conversión de `esquemaDiseno` con su tipo.
export const enRejilla = (d: DisenoSinPosicion | Diseno): Diseno => disenoEnRejilla(d) as Diseno
