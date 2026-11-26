// Sumar y quitar piezas y secciones del diseño desde el editor de la hoja. Puras: nada muta lo que recibe y un lugar que no existe devuelve el diseño tal
// cual. Lo que se suma va al primer lugar libre de su rejilla donde entra (nada se corre); una avanzada, al final de su lista. Una sección recién sumada nace
// vacía (el editor la dibuja con su «+»): una vacía no se guarda (`seccionVacia()`), porque la base pide al menos una pieza por sección. Lo que queda
// inválido por otra regla (un total en una sección con nivel) lo dice `validarDiseno()` tras el cambio.
import {
  esLaPieza,
  MAXIMO_DE_ITEMS_DEL_DISENO,
  type ClaveDePieza,
  type Diseno,
  type ItemSinPosicion,
  type Posicion,
  type SeccionDeDiseno,
} from '../diseno'
import { altoEfectivo, anchoEfectivoDelItem } from '../diseno-en-rejilla'
import { SECCION_AUTOMATICA } from '../rejilla-de-la-hoja'
import { conSeccion } from './edicion-del-diseno'
import {
  conElBloque,
  filaSiguiente,
  ordenarPorLectura,
  primerLugarLibre,
  sinBloqueSinAvanzadas,
} from './lugar-en-la-rejilla'

export const MOTIVO_DEL_TOPE_DE_PIEZAS = `La hoja ya tiene ${String(MAXIMO_DE_ITEMS_DEL_DISENO)} piezas: quita una para sumar otra.`
export const MOTIVO_DE_LA_ULTIMA_SECCION = 'La hoja necesita al menos una sección.'

export const piezasDelDiseno = (d: Diseno): number =>
  d.secciones.reduce((n, s) => n + s.items.length, 0)

export const hayLugarParaOtraPieza = (d: Diseno): boolean =>
  piezasDelDiseno(d) < MAXIMO_DE_ITEMS_DEL_DISENO

// La primera sección sin piezas: con ella el borrador no se guarda.
export const seccionVacia = (d: Diseno): SeccionDeDiseno | undefined =>
  d.secciones.find((s) => s.items.length === 0)

export const motivoDeLaSeccionVacia = (s: Pick<SeccionDeDiseno, 'id' | 'titulo'>) =>
  `La sección «${s.titulo ?? s.id}» está vacía: suma una pieza o quítala para guardar.`

// En el primer lugar libre de la sección donde entra (con `despues`, el primero después de esa posición). Con la hoja en el tope, o sin lugar, nada.
export function sumarItem(
  d: Diseno,
  seccionId: string,
  item: ItemSinPosicion,
  despues?: Posicion,
): Diseno {
  if (!hayLugarParaOtraPieza(d) || !d.secciones.some((s) => s.id === seccionId)) return d
  const tamano = { ancho: anchoEfectivoDelItem(item), alto: altoEfectivo(item) }
  const posicion = primerLugarLibre(d, { tipo: 'seccion', seccion: seccionId }, tamano, despues)
  if (posicion === null) return d
  const conLugar = { ...item, posicion } as SeccionDeDiseno['items'][number]
  return ordenarPorLectura(
    conSeccion(d, seccionId, (s) => ({ ...s, items: [...s.items, conLugar] })),
  )
}

// La primera pieza así en su sección.
export function quitarItem(d: Diseno, clave: ClaveDePieza): Diseno {
  return conSeccion(d, clave.seccion, (s) => {
    const i = s.items.findIndex((it) => esLaPieza(it, clave))
    return i < 0 ? s : { ...s, items: s.items.filter((_, k) => k !== i) }
  })
}

// El id libre `seccion_<n>` y el título «Sección <n>», con el primer n que no está tomado.
export function sumarSeccion(
  d: Diseno,
  presentacion: SeccionDeDiseno['presentacion'],
): { diseno: Diseno; seccion: string } {
  const tomados = new Set(d.secciones.map((s) => s.id))
  let n = d.secciones.length + 1
  while (tomados.has(`seccion_${String(n)}`)) n += 1
  const id = `seccion_${String(n)}`
  const conBloque = presentacion === 'avanzado' ? conElBloque(d) : d
  const posicion = lugarDeLaSeccionNueva(conBloque, presentacion)
  if (posicion === null) return { diseno: d, seccion: id }
  const seccion: SeccionDeDiseno = {
    id,
    titulo: `Sección ${String(n)}`,
    presentacion,
    posicion,
    items: [],
  }
  const diseno = ordenarPorLectura({ ...conBloque, secciones: [...conBloque.secciones, seccion] })
  return { diseno, seccion: id }
}

// Una principal nueva es «Automática» (6 columnas en escritorio) en el primer lugar libre; una avanzada, al final de su lista.
function lugarDeLaSeccionNueva(
  d: Diseno,
  presentacion: SeccionDeDiseno['presentacion'],
): Posicion | null {
  if (presentacion === 'avanzado')
    return { columna: 1, fila: filaSiguiente(d, { tipo: 'avanzadas' }) }
  return primerLugarLibre(
    d,
    { tipo: 'principales' },
    { ancho: SECCION_AUTOMATICA.columnas, alto: 1 },
  )
}

export function quitarSeccion(
  d: Diseno,
  seccionId: string,
): { ok: true; diseno: Diseno } | { ok: false; motivo: string } {
  if (!d.secciones.some((s) => s.id === seccionId)) return { ok: true, diseno: d }
  if (d.secciones.length <= 1) return { ok: false, motivo: MOTIVO_DE_LA_ULTIMA_SECCION }
  const secciones = d.secciones.filter((s) => s.id !== seccionId)
  return { ok: true, diseno: sinBloqueSinAvanzadas({ ...d, secciones }) }
}
