// Ordenar el diseño desde el editor de la hoja: mover una sección en la lista de secciones y una pieza dentro de su sección o a otra. Pasar a otra sección
// puede cambiar quién la ve (hereda el nivel de la sección nueva): el editor lo avisa (`cambioDeNivel()`) y `validarDiseno()` marca lo que la base rechazaría.
// La tarjeta del total no entra a una sección que no la admite (avanzada o con nivel). Puras: un lugar fuera de la lista devuelve el diseño tal cual.
import { esLaPieza, type ClaveDePieza, type Diseno, type ItemDeDiseno } from '../diseno'
import { conSeccion } from './edicion-del-diseno'
import { admiteElTotal } from './total-de-la-hoja'

// Lleva el elemento `desde` al lugar `hasta` (contado sin él). Nulo si alguno cae fuera de la lista o son el mismo.
export function mover<T>(lista: readonly T[], desde: number, hasta: number): readonly T[] | null {
  const dentro = (i: number) => Number.isInteger(i) && i >= 0 && i < lista.length
  if (!dentro(desde) || !dentro(hasta) || desde === hasta) return null
  const salida = [...lista]
  const [movido] = salida.splice(desde, 1)
  if (movido === undefined) return null
  salida.splice(hasta, 0, movido)
  return salida
}

export function moverSeccion(d: Diseno, desde: number, hasta: number): Diseno {
  const secciones = mover(d.secciones, desde, hasta)
  return secciones === null ? d : { ...d, secciones: [...secciones] }
}

export function moverItem(d: Diseno, seccionId: string, desde: number, hasta: number): Diseno {
  const s = d.secciones.find((x) => x.id === seccionId)
  const items = s === undefined ? null : mover(s.items, desde, hasta)
  return items === null ? d : conSeccion(d, seccionId, (x) => ({ ...x, items: [...items] }))
}

// Adónde va una pieza: una sección y el lugar que ocupa en ella al terminar (contado sin la pieza que se mueve).
export type DestinoDeLaPieza = { seccion: string; indice: number }

// Mueve la pieza `desde` (la primera así en su sección) al lugar `hasta`, en su sección o en otra. El lugar se ajusta al largo de la sección de destino.
export function moverItemA(d: Diseno, desde: ClaveDePieza, hasta: DestinoDeLaPieza): Diseno {
  const origen = d.secciones.find((s) => s.id === desde.seccion)
  const destino = d.secciones.find((s) => s.id === hasta.seccion)
  const i = origen?.items.findIndex((it) => esLaPieza(it, desde)) ?? -1
  const item = origen?.items[i]
  if (origen === undefined || destino === undefined || item === undefined) return d
  if (item.tipo === 'total' && !admiteElTotal(destino)) return d
  if (origen.id === destino.id) {
    const lugar = Math.max(0, Math.min(Math.trunc(hasta.indice), origen.items.length - 1))
    return moverItem(d, origen.id, i, lugar)
  }
  const sinElla = conSeccion(d, origen.id, (s) => ({
    ...s,
    items: s.items.filter((_, k) => k !== i),
  }))
  return conSeccion(sinElla, destino.id, (s) => insertar(s, item, hasta.indice))
}

function insertar<S extends { items: ItemDeDiseno[] }>(
  s: S,
  item: ItemDeDiseno,
  indice: number,
): S {
  const lugar = Math.max(0, Math.min(Math.trunc(indice), s.items.length))
  return { ...s, items: [...s.items.slice(0, lugar), item, ...s.items.slice(lugar)] }
}

// Un paso con el teclado (Alt+↑ / Alt+↓, «Mover antes» / «Mover después»): dentro de su sección cambia de lugar con la vecina; en el borde pasa a la sección
// vecina (al final de la anterior o al principio de la siguiente), saltando las que no admiten la tarjeta del total si es ella. Nulo si no hay adónde.
export function destinoDeUnPaso(
  d: Diseno,
  desde: ClaveDePieza,
  paso: -1 | 1,
): DestinoDeLaPieza | null {
  const s = d.secciones.findIndex((x) => x.id === desde.seccion)
  const seccion = d.secciones[s]
  const i = seccion?.items.findIndex((it) => esLaPieza(it, desde)) ?? -1
  const item = seccion?.items[i]
  if (seccion === undefined || item === undefined) return null
  const dentro = i + paso
  if (dentro >= 0 && dentro < seccion.items.length) return { seccion: seccion.id, indice: dentro }
  const vecina = seccionVecina(d, s, paso, item)
  return vecina === undefined
    ? null
    : { seccion: vecina.id, indice: paso < 0 ? vecina.items.length : 0 }
}

function seccionVecina(d: Diseno, desde: number, paso: -1 | 1, item: ItemDeDiseno) {
  const candidatas = paso < 0 ? d.secciones.slice(0, desde).reverse() : d.secciones.slice(desde + 1)
  return candidatas.find((v) => item.tipo !== 'total' || admiteElTotal(v))
}
