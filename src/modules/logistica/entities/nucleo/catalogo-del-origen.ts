// Un catálogo de logística visto desde un origen (puertos, navieras, categorías de gasto): sus dos grupos, «De <origen>» y los compartidos con todos
// los orígenes, cada uno leído con su tope; un propio activo tapa en el origen al compartido de su clave (`tapadoPor`). Puro: lo dibuja
// `CatalogoDelOrigen` en el drawer de cada catálogo, arriba del diagrama de las fases del origen.
import { tapadoPor, type FilaPropiaOCompartida } from '@/shared/lib/catalogos/propios'

export type GrupoLeido<T> = { filas: T[]; hayMas: boolean }
export type CatalogoDelOrigenLeido<T> = { propios: GrupoLeido<T>; compartidos: GrupoLeido<T> }

// «Para» de lo que se crea: sólo del origen o compartido con todos (`?de=origen|compartido`; sin `de`, `origen`).
export type ParaDelCatalogo = 'origen' | 'compartido'
export const CLAVE_DEL_PARA = 'de'

export function paraDe(valor: string | null): ParaDelCatalogo {
  return valor === 'compartido' ? 'compartido' : 'origen'
}

// Lo que se dice sin el permiso del catálogo en el origen: el drawer abre igual, en lectura.
export const MOTIVO_SIN_PERMISO_DE_CATALOGOS =
  'Pídele a quien administra los roles el permiso de configurar la logística.'

// Lo que se avisa al editar un compartido.
export const AVISO_DE_COMPARTIDO = 'Cambia para todos los orígenes que lo usan.'

// Cómo se nombra cada catálogo: los textos concuerdan en género («Nueva naviera», «Ninguna compartida», «Tapada por la de Miami»).
export type NombreDelCatalogo = { singular: string; plural: string; femenino: boolean }

export type TextosDelCatalogo = {
  nuevo: string
  tituloDeLosPropios: string
  tituloDeLosCompartidos: string
  vacio: string
  vacioDeLosPropios: string
  vacioDeLosCompartidos: string
  soloDelOrigen: string
  compartidoConTodos: string
  tapado: string
}

export function textosDelCatalogo(nombre: NombreDelCatalogo, origen: string): TextosDelCatalogo {
  const { singular, plural, femenino } = nombre
  const a = femenino ? 'a' : 'o'
  return {
    nuevo: `Nuev${a} ${singular}`,
    tituloDeLosPropios: `De ${origen}`,
    tituloDeLosCompartidos: `Compartid${a}s`,
    vacio: `Todavía no hay ${plural} en ${origen} ni compartid${a}s.`,
    vacioDeLosPropios: `Ningun${a} sólo de ${origen}.`,
    vacioDeLosCompartidos: `Ningun${a} compartid${a}.`,
    soloDelOrigen: `Sólo de ${origen}`,
    compartidoConTodos: `Compartid${a} con todos los orígenes`,
    tapado: `Tapad${a} por ${femenino ? 'la' : 'el'} de ${origen}`,
  }
}

// Los ids de los compartidos que tapa un propio activo del origen, según la clave de cada catálogo (los puertos, nombre y país).
export function compartidosTapadosEnElOrigen<T extends Omit<FilaPropiaOCompartida, 'clave'>>(
  catalogo: CatalogoDelOrigenLeido<T>,
  origenId: string,
  claveDe: (fila: T) => string,
): Set<string> {
  const filas = [...catalogo.propios.filas, ...catalogo.compartidos.filas].map((fila) => ({
    id: fila.id,
    origenId: fila.origenId,
    activo: fila.activo,
    clave: claveDe(fila),
  }))
  return new Set(
    filas.filter((fila) => tapadoPor(fila, filas, origenId) !== null).map((fila) => fila.id),
  )
}

// Todas las filas de los dos grupos: lo que «Editar» busca por id.
export function filasDelCatalogo<T>(catalogo: CatalogoDelOrigenLeido<T>): T[] {
  return [...catalogo.propios.filas, ...catalogo.compartidos.filas]
}

// Los nombres de los tres catálogos de logística que se configuran en el drawer de un origen.
export const NOMBRE_DE_PUERTO: NombreDelCatalogo = {
  singular: 'puerto',
  plural: 'puertos',
  femenino: false,
}
export const NOMBRE_DE_NAVIERA: NombreDelCatalogo = {
  singular: 'naviera',
  plural: 'navieras',
  femenino: true,
}
export const NOMBRE_DE_CATEGORIA: NombreDelCatalogo = {
  singular: 'categoría',
  plural: 'categorías de gasto',
  femenino: true,
}

// Lo que recibe el drawer de cada catálogo: el origen de la pestaña y si quien mira lo cambia ahí (`logistica.catalogos.gestionar` en el origen).
export type PropsDelCatalogoDelOrigen = {
  origen: { id: string; nombre: string }
  puedeCambiar: boolean
}
