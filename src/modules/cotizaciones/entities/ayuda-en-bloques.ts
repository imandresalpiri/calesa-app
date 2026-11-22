// La ayuda de una celda leída como bloques (docs/GLOSARIO.md › «Bloque de la ayuda»): la de antes (`{texto, enlaces?}` o `{tabla}`) es un bloque de texto
// (más uno de enlaces) o uno de tabla con todas sus columnas y sin llenar nada. El espejo de `_diseno_bloques_de_la_ayuda()`. Y qué celda puede
// llenar una columna de una tabla de la ayuda: la regla `ayuda_llena_no_acepta_valor`, que también usa el editor para ofrecerlas.
import type { AyudaDeDiseno, BloqueDeAyuda, Diseno } from './diseno'
import { esPisable, type Nodo } from './nodos'

export function ayudaEnBloques(ayuda: AyudaDeDiseno | undefined): BloqueDeAyuda[] {
  if (ayuda === undefined) return []
  if (Array.isArray(ayuda)) return [...ayuda]
  if ('tabla' in ayuda) return [{ tipo: 'tabla', tabla: ayuda.tabla }]
  const texto: BloqueDeAyuda = { tipo: 'texto', texto: ayuda.texto }
  return ayuda.enlaces === undefined
    ? [texto]
    : [texto, { tipo: 'enlaces', enlaces: ayuda.enlaces }]
}

// Un nodo que la hoja deja escribir: un dato que se tipea, una constante o un cálculo que se puede pisar (`esPisable`: no el total). El tipo de cambio
// no: se cambia para toda la empresa desde su ⚙. Una bandera, la variante y un campo del vehículo tampoco.
export const aceptaValorEnLaHoja = (n: Nodo): boolean =>
  n.tipo === 'input' || n.tipo === 'constante' || esPisable(n)

// Los nodos que dibuja una celda del diseño, en cualquier sección: el suyo y, si la celda lleva el secundario de un par, el del porcentaje.
export function nodosConCelda(
  diseno: Pick<Diseno, 'secciones'>,
  nodos: ReadonlyMap<string, Nodo>,
): string[] {
  const ids: string[] = []
  for (const s of diseno.secciones) {
    for (const it of s.items) {
      if (it.tipo !== 'celda') continue
      ids.push(it.nodo)
      const n = nodos.get(it.nodo)
      if (it.secundario !== undefined && n?.tipo === 'calculo' && n.op === 'porcentaje_de')
        ids.push(n.pct)
    }
  }
  return ids
}
