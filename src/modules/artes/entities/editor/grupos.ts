// Los grupos de capas del editor de artes (docs/GLOSARIO.md › «Grupo de capas»): de un solo nivel, con sus miembros contiguos en la página.
// Agrupar los junta donde estaba el de más arriba; desagrupar los deja sueltos donde están. Un grupo sin miembros se borra. Puro.
import { MAXIMO_DE_GRUPOS_POR_PAGINA, type CapaDeArte, type PaginaDeArte } from '../documento'

export function grupoDe(pagina: PaginaDeArte, capa: CapaDeArte) {
  return capa.grupoId === null ? undefined : pagina.grupos.find((g) => g.id === capa.grupoId)
}

// Una capa no se mueve ni se elige en el lienzo si está bloqueada ella o su grupo; no se ve si está oculta ella o su grupo.
export function estaBloqueada(pagina: PaginaDeArte, capa: CapaDeArte): boolean {
  return capa.bloqueada || grupoDe(pagina, capa)?.bloqueado === true
}

export function estaOculta(pagina: PaginaDeArte, capa: CapaDeArte): boolean {
  return capa.oculta || grupoDe(pagina, capa)?.oculto === true
}

// Lo que elige un clic sobre una capa: su grupo entero; `adentro` (doble clic, o la fila en «Capas»), sólo ella.
export function idsParaElegir(pagina: PaginaDeArte, id: string, adentro: boolean): string[] {
  const capa = pagina.capas.find((c) => c.id === id)
  if (!capa) {
    return []
  }
  if (adentro || capa.grupoId === null) {
    return [id]
  }
  return pagina.capas.filter((c) => c.grupoId === capa.grupoId).map((c) => c.id)
}

// Borra los grupos que quedaron sin miembros.
export function limpiarGrupos(pagina: PaginaDeArte): PaginaDeArte {
  const usados = new Set(pagina.capas.map((c) => c.grupoId))
  const grupos = pagina.grupos.filter((g) => usados.has(g.id))
  return grupos.length === pagina.grupos.length ? pagina : { ...pagina, grupos }
}

// Corre una posición de inserción para que no caiga entre dos miembros de un mismo grupo (quedaría partido): la lleva al final del grupo.
export function posicionSinPartirGrupos(capas: readonly CapaDeArte[], posicion: number): number {
  let i = posicion
  while (i > 0 && i < capas.length) {
    const antes = capas[i - 1]?.grupoId ?? null
    if (antes === null || antes !== (capas[i]?.grupoId ?? null)) {
      return i
    }
    i++
  }
  return i
}

function nombreDelGrupoNuevo(pagina: PaginaDeArte): string {
  const numeros = pagina.grupos.map((g) => /^Grupo (\d+)$/.exec(g.nombre)?.[1]).map(Number)
  const mayor = Math.max(0, ...numeros.filter((n) => Number.isInteger(n)))
  return `Grupo ${String(mayor + 1)}`
}

// Junta en un grupo nuevo las capas elegidas (al menos dos): quedan contiguas donde estaba la de más arriba, en su orden. Las que eran de otro
// grupo salen de él. Con el tope de grupos, la página como estaba.
export function agrupar(
  pagina: PaginaDeArte,
  ids: readonly string[],
  nuevoId: string,
): PaginaDeArte {
  const elegidos = new Set(ids)
  const miembros = pagina.capas.filter((c) => elegidos.has(c.id))
  const arriba = pagina.capas.findLastIndex((c) => elegidos.has(c.id))
  if (miembros.length < 2 || pagina.grupos.length >= MAXIMO_DE_GRUPOS_POR_PAGINA) {
    return pagina
  }
  const resto = pagina.capas.filter((c) => !elegidos.has(c.id))
  const debajo = pagina.capas.slice(0, arriba).filter((c) => !elegidos.has(c.id)).length
  const posicion = posicionSinPartirGrupos(resto, debajo)
  const capas = [
    ...resto.slice(0, posicion),
    ...miembros.map((c) => ({ ...c, grupoId: nuevoId })),
    ...resto.slice(posicion),
  ]
  const grupo = {
    id: nuevoId,
    nombre: nombreDelGrupoNuevo(pagina),
    oculto: false,
    bloqueado: false,
  }
  return limpiarGrupos({ ...pagina, capas, grupos: [...pagina.grupos, grupo] })
}

// Deshace los grupos de las capas elegidas: todos sus miembros quedan sueltos, donde están.
export function desagrupar(pagina: PaginaDeArte, ids: readonly string[]): PaginaDeArte {
  const elegidos = new Set(ids)
  const grupos = new Set(
    pagina.capas.filter((c) => elegidos.has(c.id) && c.grupoId !== null).map((c) => c.grupoId),
  )
  if (grupos.size === 0) {
    return pagina
  }
  const capas = pagina.capas.map((c) => (grupos.has(c.grupoId) ? { ...c, grupoId: null } : c))
  return limpiarGrupos({ ...pagina, capas })
}
