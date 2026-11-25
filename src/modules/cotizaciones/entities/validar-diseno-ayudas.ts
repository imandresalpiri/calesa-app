// §7 de `validarDiseno()`: la ayuda de cada celda (docs/GLOSARIO.md › «Ayuda (de una celda)»), leída como bloques. El espejo de `_diseno_ayudas()`.
// Celda por celda en el orden del diseño y bloque por bloque, el primero que falla, con `donde` = el nodo de la celda:
// - la URL de un enlace empieza con `https://` y sigue con ASCII imprimible sin espacios (`ayuda_enlace_no_https`);
// - con el catálogo de tablas en el contexto (publicar a mano lo trae; la N+1 de una tabla no), la tabla de un bloque existe (`ayuda_tabla_inexistente`)
//   y, columna por columna, la columna también (`ayuda_columna_inexistente`). La ayuda de antes (`{tabla}`) no se mira contra el catálogo: la hoja ya la
//   deja caer si su tabla no está, y se mira en cuanto el editor la pasa a bloques;
// - siempre, una columna que llena nombra un nodo que la hoja deja escribir en una celda del diseño (`ayuda_llena_no_acepta_valor`).
import { aceptaValorEnLaHoja, ayudaEnBloques } from './ayuda-en-bloques'
import {
  URL_DE_ENLACE,
  type AyudaDeDiseno,
  type BloqueDeAyuda,
  type Diseno,
  type EnlaceDeAyuda,
} from './diseno'
import { buscar, esta, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Indice } from './validar-diseno-contexto'

type Catalogo = Indice['tablas']

// Lo de todo el diseño: las celdas que aceptan un valor se buscan una vez, con la primera columna que llena.
interface Revision {
  readonly ix: Indice
  readonly d: Diseno
  aceptan: ReadonlySet<string> | null
}

export function revisarAyudas(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  const r: Revision = { ix, d, aceptan: null }
  for (const s of recorrer(d.secciones, ix.m)) {
    for (const it of recorrer(s.items, ix.m)) {
      if (it.tipo !== 'celda' || it.ayuda === undefined) continue
      const f = revisarLaAyuda(r, it.nodo, it.ayuda)
      if (f !== undefined) return f
    }
  }
  return undefined
}

function revisarLaAyuda(
  r: Revision,
  donde: string,
  ayuda: AyudaDeDiseno,
): FalloDeDiseno | undefined {
  const catalogo = Array.isArray(ayuda) ? r.ix.tablas : null
  for (const b of recorrer(ayudaEnBloques(ayuda), r.ix.m)) {
    const f =
      b.tipo === 'enlaces'
        ? revisarLosEnlaces(r.ix, donde, b.enlaces)
        : b.tipo === 'tabla'
          ? revisarLaTabla(r, donde, b, catalogo)
          : undefined
    if (f !== undefined) return f
  }
  return undefined
}

function revisarLosEnlaces(
  ix: Indice,
  donde: string,
  enlaces: readonly EnlaceDeAyuda[],
): FalloDeDiseno | undefined {
  for (const e of recorrer(enlaces, ix.m)) {
    if (!URL_DE_ENLACE.test(e.url)) return fallo('ayuda_enlace_no_https', { donde })
  }
  return undefined
}

function revisarLaTabla(
  r: Revision,
  donde: string,
  b: Extract<BloqueDeAyuda, { tipo: 'tabla' }>,
  catalogo: Catalogo,
): FalloDeDiseno | undefined {
  const { ix } = r
  const columnas = catalogo === null ? undefined : buscar(catalogo, b.tabla, ix.m)
  if (catalogo !== null && columnas === undefined)
    return fallo('ayuda_tabla_inexistente', { donde, ref: b.tabla })
  for (const c of recorrer(b.columnas ?? [], ix.m)) {
    if (columnas !== undefined && !esta(columnas, c.columna, ix.m)) {
      return fallo('ayuda_columna_inexistente', { donde, ref: c.columna, tabla: b.tabla })
    }
    if (c.llena === undefined) continue
    r.aceptan ??= celdasQueAceptan(ix, r.d)
    if (!esta(r.aceptan, c.llena, ix.m))
      return fallo('ayuda_llena_no_acepta_valor', { donde, ref: c.columna })
  }
  return undefined
}

// El nodo de cada celda y el del porcentaje de una celda con secundario, si la hoja lo deja escribir (`aceptaValorEnLaHoja`).
function celdasQueAceptan(ix: Indice, d: Diseno): Set<string> {
  const aceptan = new Set<string>()
  for (const s of recorrer(d.secciones, ix.m)) {
    for (const it of recorrer(s.items, ix.m)) {
      if (it.tipo !== 'celda') continue
      const n = buscar(ix.nodos, it.nodo, ix.m)
      if (n === undefined) continue
      if (aceptaValorEnLaHoja(n)) aceptan.add(n.id)
      if (it.secundario === undefined || n.tipo !== 'calculo' || n.op !== 'porcentaje_de') continue
      const pct = buscar(ix.nodos, n.pct, ix.m)
      if (pct !== undefined && aceptaValorEnLaHoja(pct)) aceptan.add(pct.id)
    }
  }
  return aceptan
}
