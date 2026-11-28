// Lo que el editor de artes le hace a las capas de una página: agregar, cambiar, mover, quitar, copiar y pegar, renombrar, ocultar o
// bloquear, elegir con un recuadro, alinear y distribuir. Cada una devuelve la misma página si no cambia nada; las que agregan, nula si pasan
// el tope. Puro.
import {
  LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA,
  MAXIMO_DE_CAPAS_POR_PAGINA,
  MAXIMO_DE_GRUPOS_POR_PAGINA,
  type CapaDeArte,
  type GrupoDeCapas,
  type PaginaDeArte,
} from '../documento'
import type { Medidas } from '../formatos'
import { alinear, distribuir, type Alineacion, type Corrimiento } from './alinear'
import { cajaDe, seCruzan, union, type Caja } from './cajas'
import { estaBloqueada, estaOculta, idsParaElegir, limpiarGrupos } from './grupos'

// Cuánto se corre una copia (duplicar, pegar) de su original.
export const DESPLAZAMIENTO_DE_LA_COPIA = 16

export type Portapapeles = { capas: readonly CapaDeArte[]; grupos: readonly GrupoDeCapas[] }

export const MENSAJE_DEL_TOPE_DE_CAPAS = `Una página lleva hasta ${String(MAXIMO_DE_CAPAS_POR_PAGINA)} elementos.`

// Si caben `cuantas` capas más en la página (agregar y pegar se apagan si no).
export function hayLugar(pagina: PaginaDeArte, cuantas = 1): boolean {
  return pagina.capas.length + cuantas <= MAXIMO_DE_CAPAS_POR_PAGINA
}

export function agregarCapas(
  pagina: PaginaDeArte,
  capas: readonly CapaDeArte[],
): PaginaDeArte | null {
  if (pagina.capas.length + capas.length > MAXIMO_DE_CAPAS_POR_PAGINA) {
    return null
  }
  return capas.length === 0 ? pagina : { ...pagina, capas: [...pagina.capas, ...capas] }
}

export function cambiarCapas(
  pagina: PaginaDeArte,
  ids: readonly string[],
  cambio: (capa: CapaDeArte) => CapaDeArte,
): PaginaDeArte {
  const elegidas = new Set(ids)
  const capas = pagina.capas.map((capa) => (elegidas.has(capa.id) ? cambio(capa) : capa))
  return capas.some((capa, i) => capa !== pagina.capas[i]) ? { ...pagina, capas } : pagina
}

// Corre las capas elegidas que no están bloqueadas (ni su grupo).
export function moverCapas(
  pagina: PaginaDeArte,
  ids: readonly string[],
  corrimiento: Corrimiento,
): PaginaDeArte {
  const { dx, dy } = corrimiento
  if (dx === 0 && dy === 0) {
    return pagina
  }
  const libres = pagina.capas
    .filter((c) => ids.includes(c.id) && !estaBloqueada(pagina, c))
    .map((c) => c.id)
  return cambiarCapas(pagina, libres, (c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
}

export function quitarCapas(pagina: PaginaDeArte, ids: readonly string[]): PaginaDeArte {
  const elegidas = new Set(ids)
  const capas = pagina.capas.filter((c) => !elegidas.has(c.id))
  return capas.length === pagina.capas.length ? pagina : limpiarGrupos({ ...pagina, capas })
}

// Lo que se copia de las elegidas: sus capas en orden y los grupos que van enteros (una copia de algunos miembros va suelta).
export function portapapelesDe(pagina: PaginaDeArte, ids: readonly string[]): Portapapeles {
  const elegidas = new Set(ids)
  const capas = pagina.capas.filter((c) => elegidas.has(c.id))
  const grupos = pagina.grupos.filter((g) => {
    const miembros = pagina.capas.filter((c) => c.grupoId === g.id)
    return miembros.length > 0 && miembros.every((c) => elegidas.has(c.id))
  })
  const enteros = new Set(grupos.map((g) => g.id))
  return {
    capas: capas.map((c) =>
      c.grupoId === null || enteros.has(c.grupoId) ? c : { ...c, grupoId: null },
    ),
    grupos,
  }
}

// Las copias del portapapeles con ids nuevos, corridas `desplazamiento` en los dos ejes.
export function copiasDe(
  portapapeles: Portapapeles,
  nuevoId: () => string,
  desplazamiento: number,
): Portapapeles {
  const ids = new Map(portapapeles.grupos.map((g) => [g.id, nuevoId()]))
  return {
    grupos: portapapeles.grupos.map((g) => ({ ...g, id: ids.get(g.id) ?? nuevoId() })),
    capas: portapapeles.capas.map((c) => ({
      ...c,
      id: nuevoId(),
      grupoId: c.grupoId === null ? null : (ids.get(c.grupoId) ?? null),
      x: c.x + desplazamiento,
      y: c.y + desplazamiento,
    })),
  }
}

// Pone las copias encima de todo; nula si pasan el tope de capas o de grupos.
export function pegarCopias(pagina: PaginaDeArte, copias: Portapapeles): PaginaDeArte | null {
  const conCapas = agregarCapas(pagina, copias.capas)
  if (
    conCapas === null ||
    pagina.grupos.length + copias.grupos.length > MAXIMO_DE_GRUPOS_POR_PAGINA
  ) {
    return null
  }
  return copias.grupos.length === 0
    ? conCapas
    : { ...conCapas, grupos: [...pagina.grupos, ...copias.grupos] }
}

// Renombra una capa o un grupo. Una capa sin nombre vuelve al que dice lo que es; un grupo no se queda sin nombre.
export function renombrar(pagina: PaginaDeArte, id: string, nombre: string): PaginaDeArte {
  const limpio = [...nombre.trim()].slice(0, LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA).join('')
  if (pagina.grupos.some((g) => g.id === id)) {
    if (limpio === '') {
      return pagina
    }
    return {
      ...pagina,
      grupos: pagina.grupos.map((g) =>
        g.id === id && g.nombre !== limpio ? { ...g, nombre: limpio } : g,
      ),
    }
  }
  const valor = limpio === '' ? null : limpio
  return cambiarCapas(pagina, [id], (c) => (c.nombre === valor ? c : { ...c, nombre: valor }))
}

// Oculta o muestra, bloquea o desbloquea una capa o un grupo.
export function alternar(
  pagina: PaginaDeArte,
  id: string,
  que: 'oculta' | 'bloqueada',
): PaginaDeArte {
  if (pagina.grupos.some((g) => g.id === id)) {
    const campo = que === 'oculta' ? 'oculto' : 'bloqueado'
    return {
      ...pagina,
      grupos: pagina.grupos.map((g) => (g.id === id ? { ...g, [campo]: !g[campo] } : g)),
    }
  }
  return cambiarCapas(pagina, [id], (c) => ({ ...c, [que]: !c[que] }))
}

// Las que se pueden elegir en el lienzo: visibles y sin bloquear (ni ellas ni su grupo).
export function elegibles(pagina: PaginaDeArte): CapaDeArte[] {
  return pagina.capas.filter((c) => !estaOculta(pagina, c) && !estaBloqueada(pagina, c))
}

// Lo que elige el recuadro: las elegibles que toca, con sus grupos enteros, en el orden de la página.
export function idsEnRecuadro(pagina: PaginaDeArte, recuadro: Caja): string[] {
  const tocadas = elegibles(pagina).filter((c) => seCruzan(cajaDe(c), recuadro))
  const ids = new Set(tocadas.flatMap((c) => idsParaElegir(pagina, c.id, false)))
  return pagina.capas.filter((c) => ids.has(c.id)).map((c) => c.id)
}

type Unidad = { ids: string[]; caja: Caja }

// Lo que se alinea como una sola caja: un grupo con todos sus miembros elegidos, o cada capa suelta. Las bloqueadas no se mueven.
function unidadesDe(pagina: PaginaDeArte, ids: readonly string[]): Unidad[] {
  const elegidas = new Set(ids)
  const porClave = new Map<string, CapaDeArte[]>()
  for (const capa of pagina.capas) {
    if (!elegidas.has(capa.id) || estaBloqueada(pagina, capa)) {
      continue
    }
    const grupo = capa.grupoId
    const entero =
      grupo !== null && pagina.capas.every((c) => c.grupoId !== grupo || elegidas.has(c.id))
    const clave = entero ? `grupo:${grupo}` : capa.id
    porClave.set(clave, [...(porClave.get(clave) ?? []), capa])
  }
  return [...porClave.values()].flatMap((capas) => {
    const caja = union(capas.map(cajaDe))
    return caja ? [{ ids: capas.map((c) => c.id), caja }] : []
  })
}

function correrUnidades(
  pagina: PaginaDeArte,
  unidades: readonly Unidad[],
  corrimientos: readonly Corrimiento[],
) {
  return unidades.reduce((actual, unidad, i) => {
    const corrimiento = corrimientos[i]
    return corrimiento ? moverCapas(actual, unidad.ids, corrimiento) : actual
  }, pagina)
}

export function alinearCapas(
  pagina: PaginaDeArte,
  ids: readonly string[],
  como: Alineacion,
  medidas: Medidas,
) {
  const unidades = unidadesDe(pagina, ids)
  return correrUnidades(
    pagina,
    unidades,
    alinear(
      unidades.map((u) => u.caja),
      como,
      medidas,
    ),
  )
}

export function distribuirCapas(
  pagina: PaginaDeArte,
  ids: readonly string[],
  eje: 'horizontal' | 'vertical',
) {
  const unidades = unidadesDe(pagina, ids)
  return correrUnidades(
    pagina,
    unidades,
    distribuir(
      unidades.map((u) => u.caja),
      eje,
    ),
  )
}
