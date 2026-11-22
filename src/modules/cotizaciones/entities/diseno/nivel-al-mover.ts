// Si mover una pieza a otra sección cambia quién la ve o quién la edita (el editor de la hoja lo avisa en el inspector: «Ahora la ve «Costos»: antes la veían
// todos.»). El nivel efectivo de una pieza es el suyo (sólo la celda lo lleva), si no el de su sección, si no «todos», como `_compilar_visibilidad()`.
// Puras.
import { NIVEL_TODOS, esLaPieza, type Diseno, type PiezaEnLaSeccion } from '../diseno'

export type NivelEfectivo = { ver: string; editar: string }

export function nivelEfectivo(
  d: Diseno,
  seccionId: string,
  pieza: PiezaEnLaSeccion,
): NivelEfectivo | null {
  const s = d.secciones.find((x) => x.id === seccionId)
  const it = s?.items.find((x) => esLaPieza(x, pieza))
  if (s === undefined || it === undefined) return null
  const propio = it.tipo === 'celda' ? it : undefined
  return {
    ver: propio?.nivel_ver ?? s.nivel_ver ?? NIVEL_TODOS,
    editar: propio?.nivel_editar ?? s.nivel_editar ?? NIVEL_TODOS,
  }
}

export type CambioDeNivel = { antes: NivelEfectivo; despues: NivelEfectivo }

// Nulo si sigue igual (o si la pieza no está en alguno de los dos).
export function cambioDeNivel(
  antes: { diseno: Diseno; seccion: string },
  despues: { diseno: Diseno; seccion: string },
  pieza: PiezaEnLaSeccion,
): CambioDeNivel | null {
  const a = nivelEfectivo(antes.diseno, antes.seccion, pieza)
  const b = nivelEfectivo(despues.diseno, despues.seccion, pieza)
  if (a === null || b === null || (a.ver === b.ver && a.editar === b.editar)) return null
  return { antes: a, despues: b }
}

// El aviso, con los nombres de los niveles (`nombreDe` da el nombre de una clave; «todos» es «todos»).
export function avisoDelCambioDeNivel(
  c: CambioDeNivel,
  nombreDe: (clave: string) => string,
): string {
  const quien = (clave: string) => (clave === NIVEL_TODOS ? 'todos' : `«${nombreDe(clave)}»`)
  if (c.antes.ver !== c.despues.ver) {
    const ahora =
      c.despues.ver === NIVEL_TODOS ? 'Ahora la ven todos' : `Ahora la ve ${quien(c.despues.ver)}`
    const antes =
      c.antes.ver === NIVEL_TODOS ? 'antes la veían todos' : `antes la veía ${quien(c.antes.ver)}`
    return `${ahora}: ${antes}.`
  }
  const ahora =
    c.despues.editar === NIVEL_TODOS
      ? 'Ahora la editan todos'
      : `Ahora la edita ${quien(c.despues.editar)}`
  const antes =
    c.antes.editar === NIVEL_TODOS
      ? 'antes la editaban todos'
      : `antes la editaba ${quien(c.antes.editar)}`
  return `${ahora}: ${antes}.`
}
