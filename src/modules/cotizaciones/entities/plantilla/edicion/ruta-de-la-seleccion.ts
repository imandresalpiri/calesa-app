// Cómo se nombra lo elegido en el lienzo: la ruta del panel («Fila 4 › Columna «B · Concepto»»), lo que se anuncia al lector de pantalla al cambiar la selección y
// el nombre accesible de cada celda (sin montos: un monto en un `aria-label` esquivaría el Modo Live). Puro.
import type {
  ContenidoDeLaCelda,
  PlantillaEnCuadricula,
  TextoConDatos,
  TextoSimple,
} from '../../cuadricula-de-la-tarjeta'
import { textoDeLasPartes } from '../../texto-con-datos'
import { rotuloDeColumna } from './columnas'
import type { MapaDeLaGrilla } from './mapa-de-la-grilla'
import { rangoDe, type Seleccion } from './seleccion'
import type { Rect } from './tipos'

const columna = (p: PlantillaEnCuadricula, k: number) => rotuloDeColumna(k, p.columnas[k]?.id ?? '')

const casillas = (r: Rect) => (r.f1 - r.f0 + 1) * (r.k1 - r.k0 + 1)

// «Fila 4 › Columna «B · Concepto»», «Filas 2 a 4 › Columnas «A» a «C»», «Fila 3», «Columnas «B · Concepto» a «D»».
export function rutaDeLaSeleccion(
  sel: Seleccion,
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
): string {
  const r = rangoDe(sel, mapa, p)
  const filas =
    r.f0 === r.f1 ? `Fila ${String(r.f0 + 1)}` : `Filas ${String(r.f0 + 1)} a ${String(r.f1 + 1)}`
  const columnas =
    r.k0 === r.k1
      ? `Columna «${columna(p, r.k0)}»`
      : `Columnas «${columna(p, r.k0)}» a «${columna(p, r.k1)}»`
  if (sel.tipo === 'filas') return filas
  if (sel.tipo === 'columnas') return columnas
  return `${filas} › ${columnas}`
}

// Lo que se anuncia al elegir: la ruta y, en un rango, cuántas casillas.
export function anuncioDeLaSeleccion(
  sel: Seleccion | null,
  mapa: MapaDeLaGrilla,
  p: PlantillaEnCuadricula,
): string {
  if (sel === null) return 'Sin selección.'
  const ruta = rutaDeLaSeleccion(sel, mapa, p)
  const n = casillas(rangoDe(sel, mapa, p))
  return n > 1 ? `${ruta}: ${String(n)} casillas.` : `${ruta}.`
}

// Un texto fijo vacío es «Vacía»; un texto con datos, sus partes de texto o, sin ellas, «Texto con datos».
function nombreDelTexto(c: TextoSimple | TextoConDatos): string {
  if ('partes' in c) {
    const texto = textoDeLasPartes(c.partes)
    return texto.trim() === '' ? 'Texto con datos' : texto
  }
  return c.texto.trim() === '' ? 'Vacía' : c.texto
}

// El nombre de lo que una celda muestra, para su `aria-label` y la cabecera del panel: el texto (de un texto con datos, sus partes de texto o, sin ellas, «Texto con
// datos»), «Dato: «Remate» · Monto», «Dato: Número», «Logo», «Foto del asesor» o «Vacía».
export function nombreDelContenido(
  c: ContenidoDeLaCelda | null,
  nombres: {
    nodo: (id: string) => string
    variable: (v: string) => string
    mostrar: (m: string) => string
  },
): string {
  if (c === null || c.tipo === 'vacio') return 'Vacía'
  if (c.tipo === 'texto') return nombreDelTexto(c)
  if (c.tipo === 'logo') return 'Logo'
  if (c.tipo === 'foto_del_asesor') return 'Foto del asesor'
  if (c.tipo === 'respaldo') return 'Dato: el primero con valor'
  if (c.tipo === 'condiciones') return 'Dato: según condiciones'
  if ('variable' in c) return `Dato: ${nombres.variable(c.variable)}`
  return `Dato: «${nombres.nodo(c.nodo)}» · ${nombres.mostrar(c.mostrar)}`
}
