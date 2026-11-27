// Editar el aspecto del diseño (docs/GLOSARIO.md › «Aspecto»): operaciones puras sobre una sección, un ítem y la cabecera. Un valor por defecto (o nulo)
// quita la clave en vez de escribirla, así un diseño que no se tocó queda igual al guardado; lo que no está en su escala se ignora (los selects no lo
// ofrecen; si llegara, no se escribe). Nada muta lo que recibe.
import {
  ANCHOS,
  ASPECTO_POR_DEFECTO,
  COLUMNAS_DE_LA_REJILLA,
  DENSIDADES_DE_SECCION,
  ENFASIS,
  LETRAS,
  MAXIMO_DE_FILAS,
  RELLENOS,
  SEPARACIONES,
  type AnchoDeCelda,
  type CabeceraDeDiseno,
  type DensidadDeSeccion,
  type Diseno,
  type Enfasis,
  type ItemDeDiseno,
  type Letra,
  type PiezaEnLaSeccion,
  esLaPieza,
  type Relleno,
  type Separacion,
} from '../diseno'
import { esquemaId } from '../nodos'
import { conSeccion } from './edicion-del-diseno'

// El ancho y el alto no son del aspecto: los escribe `ponerTamano()` (`tamano-en-la-rejilla.ts`), que revisa que la pieza entre sin pisar a nadie.
export type CambioDeAspectoDeSeccion = {
  relleno?: Relleno
  separacion?: Separacion
  densidad?: DensidadDeSeccion
  letra?: Letra
  enfasis?: Enfasis
  tono?: string | null
}
export type CambioDeAspectoDeItem = {
  letra?: Letra
  enfasis?: Enfasis
}
export type CambioDeAspectoDeLaCabecera = {
  tono?: string | null
  relleno?: Relleno
  letra?: Letra
  enfasis?: Enfasis
}

const entero = (n: unknown, max: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= max

// Lo que vale cada clave: `undefined` = no se toca; `null` = se quita; un valor = se escribe.
type Decision = unknown | null | undefined

// El valor que queda de una clave de una escala: el de por defecto (o nulo) la quita; uno fuera de la escala no la toca.
function enEscala<T extends string>(
  valor: T | undefined,
  escala: readonly T[],
  porDefecto?: T,
): Decision {
  if (valor === undefined || !escala.includes(valor)) return undefined
  return valor === porDefecto ? null : valor
}

function filasDe(alto: number | null | undefined): Decision {
  if (alto === undefined) return undefined
  if (alto === null || alto === 1) return null
  return entero(alto, MAXIMO_DE_FILAS) ? alto : undefined
}

function tonoDe(tono: string | null | undefined): Decision {
  if (tono === undefined) return undefined
  return tono === null ? null : esquemaId.safeParse(tono).success ? tono : undefined
}

function aplicar<T extends object>(objeto: T, decisiones: Record<string, Decision>): T {
  const salida: Record<string, unknown> = { ...(objeto as Record<string, unknown>) }
  for (const [clave, decision] of Object.entries(decisiones)) {
    if (decision === undefined) continue
    if (decision === null) delete salida[clave]
    else salida[clave] = decision
  }
  return salida as T
}

const deTexto = (c: { letra?: Letra; enfasis?: Enfasis }) => ({
  letra: enEscala(c.letra, LETRAS, ASPECTO_POR_DEFECTO.letra),
  enfasis: enEscala(c.enfasis, ENFASIS, ASPECTO_POR_DEFECTO.enfasis),
})

export function ponerAspectoDeSeccion(
  d: Diseno,
  seccionId: string,
  c: CambioDeAspectoDeSeccion,
): Diseno {
  return conSeccion(d, seccionId, (s) =>
    aplicar(s, {
      relleno: enEscala(c.relleno, RELLENOS, ASPECTO_POR_DEFECTO.relleno),
      separacion: enEscala(c.separacion, SEPARACIONES, ASPECTO_POR_DEFECTO.separacion),
      densidad: enEscala(c.densidad, DENSIDADES_DE_SECCION, ASPECTO_POR_DEFECTO.densidad),
      ...deTexto(c),
      tono: tonoDe(c.tono),
    }),
  )
}

// El ancho de una celda es obligatorio: un número (o uno con nombre) la reemplaza y nulo no hace nada. En los demás ítems, 12 columnas o nulo lo quitan
// (sin ancho ocupan la fila entera).
function anchoDe(item: ItemDeDiseno, ancho: AnchoDeCelda | null | undefined): Decision {
  if (ancho === undefined) return undefined
  if (item.tipo === 'celda') {
    if (ancho === null) return undefined
    return entero(ancho, COLUMNAS_DE_LA_REJILLA) || ANCHOS.includes(ancho as never)
      ? ancho
      : undefined
  }
  if (ancho === null || ancho === COLUMNAS_DE_LA_REJILLA) return null
  return entero(ancho, COLUMNAS_DE_LA_REJILLA) ? ancho : undefined
}

// La primera pieza así en la sección (`esLaPieza`).
export function ponerAspectoDeItem(
  d: Diseno,
  seccionId: string,
  item: PiezaEnLaSeccion,
  c: CambioDeAspectoDeItem,
): Diseno {
  return conSeccion(d, seccionId, (s) => {
    let hecho = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecho || !esLaPieza(it, item)) return it
        hecho = true
        return aplicar(it, deTexto(c))
      }),
    }
  })
}

// El tamaño escrito tal cual, sin mirar la geometría: sólo lo llama `ponerTamano()`, que ya sabe que entra. Sin ancho, la sección es «Automática»; con
// 12 columnas ocupa su fila (no es lo mismo: no se quita).
export type TamanoDeSeccion = { ancho?: number | null; alto?: number | null }
export type TamanoDelItem = { ancho?: AnchoDeCelda | null; alto?: number | null }

export function escribirTamanoDeSeccion(d: Diseno, seccionId: string, t: TamanoDeSeccion): Diseno {
  const ancho =
    t.ancho === undefined || t.ancho === null || entero(t.ancho, COLUMNAS_DE_LA_REJILLA)
      ? t.ancho
      : undefined
  return conSeccion(d, seccionId, (s) => aplicar(s, { ancho, alto: filasDe(t.alto) }))
}

// La primera pieza así en la sección (`esLaPieza`).
export function escribirTamanoDelItem(
  d: Diseno,
  seccionId: string,
  item: PiezaEnLaSeccion,
  t: TamanoDelItem,
): Diseno {
  return conSeccion(d, seccionId, (s) => {
    let hecho = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecho || !esLaPieza(it, item)) return it
        hecho = true
        return aplicar(it, { ancho: anchoDe(it, t.ancho), alto: filasDe(t.alto) })
      }),
    }
  })
}

export function ponerAspectoDeLaCabecera(d: Diseno, c: CambioDeAspectoDeLaCabecera): Diseno {
  const cabecera: CabeceraDeDiseno = aplicar(d.cabecera, {
    tono: tonoDe(c.tono),
    relleno: enEscala(c.relleno, RELLENOS, ASPECTO_POR_DEFECTO.relleno),
    ...deTexto(c),
  })
  return { ...d, cabecera }
}
