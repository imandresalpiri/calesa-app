// Editar el diseño de un origen desde la página del origen › Diseño (4.22-2): la versión que se abre, las operaciones puras sobre una sección y una celda,
// el pedido de guardar el borrador y si hay algo por guardar. Nada muta lo que recibe. El diseño que sale de aquí lo vuelve a revisar `validarDiseno()` en cada cambio
// y la base al publicar; guardar un borrador no exige que valide (como la fórmula, 4.21-3b-1).
import type { Resultado } from '@/shared/lib/errores'
import {
  type AnchoDeCelda,
  type Diseno,
  type SeccionDeDiseno,
  ANCHOS,
  COLUMNAS_DE_LA_REJILLA,
  PRESENTACIONES,
} from '../diseno'
import { tablasParaElCompilador, type TablaDelCatalogoDelOrigen } from '../catalogo-de-tablas'
import type { Definicion } from '../formula'
import type { ContextoDeDiseno } from '../validar-diseno'
import { cambiarDeEspacio } from './lugar-en-la-rejilla'

// Un nivel como lo lee el editor de `cotizaciones_niveles`.
export type NivelDelDiseno = { clave: string; nombre: string; retirado: boolean }

// La versión que se edita: el borrador o, sin borrador, la publicada. `actualizadoEn` es el texto de la base (con sus microsegundos): nunca pasa por `Date`.
// `params` va tal cual lo guarda la base: este editor no los toca. `formulaDelOrigenId`, la fórmula del origen de esa versión (la de trabajo al leerla): guardar
// escribe en ella y no en la de trabajo de ese momento.
export type DisenoParaEditar = {
  id: string
  formulaDelOrigenId: string
  estado: 'borrador' | 'publicada'
  actualizadoEn: string
  nota: string | null
  definicion: Definicion
  params: Record<string, unknown>
  diseno: Diseno | null
}

export type EsperadaDeGuardarDiseno =
  { sobre: 'publicada'; publicadaId: string } | { sobre: 'borrador'; actualizadoEn: string }

// Lo que se manda a `formula_guardar_borrador()`: la definición de trabajo (la leída con el rótulo y el formato que se editaron en el inspector,
// `definicionConNodos()`; la base la valida con `validar_formula()`) y los `params` como se leyeron.
export type PedidoDeGuardarDiseno = {
  origenId: string
  formulaDelOrigenId: string
  definicion: Definicion
  params: Record<string, unknown>
  diseno: Diseno
  nota: string | null
  esperada: EsperadaDeGuardarDiseno
}

// La fila escrita: su id y la hora que le puso la base, para volver a guardar sin releer.
export type BorradorDelDisenoGuardado = { id: string; actualizadoEn: string }

// Lo que escribe el editor del diseño: guarda el borrador por `formula_guardar_borrador()` (sobre la publicada lo crea, sobre el borrador lo pisa con su hora).
export interface RepositorioDelDiseno {
  guardarBorrador(pedido: PedidoDeGuardarDiseno): Promise<Resultado<BorradorDelDisenoGuardado>>
}

export const MOTIVO_SIN_PERMISO_DEL_DISENO =
  'No tienes permiso para configurar el diseño de este origen.'

export const MAXIMO_DEL_TITULO = 80

// Sobre qué guarda el editor: la versión leída y, tras guardar, la fila que devolvió la base.
export type BaseDelDiseno = Pick<
  DisenoParaEditar,
  'id' | 'formulaDelOrigenId' | 'estado' | 'actualizadoEn' | 'nota'
>

// Sobre la publicada crea el borrador (su id como esperada, la nota nula: la de la publicada es de su publicación); sobre el borrador lo pisa con su hora y su nota.
// `trabajo.definicion` es la de trabajo, con lo editado de cada nodo.
export function pedidoDeGuardarDiseno(
  base: BaseDelDiseno,
  trabajo: Pick<DisenoParaEditar, 'definicion' | 'params'>,
  diseno: Diseno,
  origenId: string,
): PedidoDeGuardarDiseno {
  const comun = {
    origenId,
    formulaDelOrigenId: base.formulaDelOrigenId,
    definicion: trabajo.definicion,
    params: trabajo.params,
    diseno,
  }
  return base.estado === 'publicada'
    ? { ...comun, nota: null, esperada: { sobre: 'publicada', publicadaId: base.id } }
    : {
        ...comun,
        nota: base.nota,
        esperada: { sobre: 'borrador', actualizadoEn: base.actualizadoEn },
      }
}

export const conSeccion = (
  diseno: Diseno,
  seccionId: string,
  cambiar: (s: SeccionDeDiseno) => SeccionDeDiseno,
): Diseno => ({
  ...diseno,
  secciones: diseno.secciones.map((s) => (s.id === seccionId ? cambiar(s) : s)),
})

// El título vacío o de blancos quita la clave (la base pide de 1 a 80 caracteres); más largo se corta. Otra presentación la pasa al otro espacio de la
// rejilla, a un lugar libre (`cambiarDeEspacio()`).
export function ponerSeccion(
  diseno: Diseno,
  seccionId: string,
  cambios: { titulo?: string; presentacion?: SeccionDeDiseno['presentacion'] },
): Diseno {
  const conTitulo = conSeccion(diseno, seccionId, (s) => {
    if (cambios.titulo === undefined) return s
    const { titulo: _anterior, ...resto } = s
    const limpio = Array.from(cambios.titulo.trim()).slice(0, MAXIMO_DEL_TITULO).join('')
    return limpio === '' ? resto : { ...resto, titulo: limpio }
  })
  return cambios.presentacion !== undefined && PRESENTACIONES.includes(cambios.presentacion)
    ? cambiarDeEspacio(conTitulo, seccionId, cambios.presentacion)
    : conTitulo
}

// Un ancho con nombre de los diseños guardados o un número de columnas (1 a 12); otro valor no se escribe.
export function ponerAncho(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  ancho: AnchoDeCelda,
): Diseno {
  const vale =
    typeof ancho === 'number'
      ? Number.isInteger(ancho) && ancho >= 1 && ancho <= COLUMNAS_DE_LA_REJILLA
      : ANCHOS.includes(ancho)
  if (!vale) return diseno
  return conSeccion(diseno, seccionId, (s) => {
    let hecha = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecha || it.tipo !== 'celda' || it.nodo !== nodoId) return it
        hecha = true
        return { ...it, ancho }
      }),
    }
  })
}

// Lo que `validarDiseno()` necesita saber del mundo: los niveles (también los retirados), los retirados, los tonos (los del catálogo de la empresa más los de
// los grupos de la propia definición: `tono_inexistente` de un grupo la dice la base al publicar) y el catálogo de tablas del origen (la tabla y las columnas
// de un bloque de la ayuda). Si el catálogo de tonos no se pudo leer (`null`), también los que el diseño ya nombra: sin catálogo no hay una falsa alarma. Sin
// el de tablas, no se revisa que existan (como la N+1 de una tabla).
export function contextoDelEditor(
  definicion: Definicion,
  niveles: readonly NivelDelDiseno[],
  catalogos: {
    tonos?: readonly string[] | null
    diseno?: Diseno | undefined
    tablas?: readonly TablaDelCatalogoDelOrigen[] | null
  } = {},
): ContextoDeDiseno {
  const { tonos: catalogo = null, diseno, tablas = null } = catalogos
  const delDiseno =
    catalogo !== null || diseno === undefined
      ? []
      : [
          ...(diseno.cabecera.tono === undefined ? [] : [diseno.cabecera.tono]),
          ...diseno.secciones.flatMap((s) => (s.tono === undefined ? [] : [s.tono])),
        ]
  return {
    niveles: niveles.map((n) => n.clave),
    retirados: niveles.filter((n) => n.retirado).map((n) => n.clave),
    tonos: [
      ...new Set([
        ...(definicion.grupos ?? []).map((g) => g.tono),
        ...(catalogo ?? []),
        ...delDiseno,
      ]),
    ],
    ...(tablas === null ? {} : { tablas: tablasParaElCompilador(tablas) }),
  }
}

// Iguales en profundidad: el orden de las claves no cuenta, el de una lista sí, y una clave indefinida es una ausente.
function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => iguales(x, b[i]))
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const clavesA = Object.keys(ra).filter((k) => ra[k] !== undefined)
  const clavesB = Object.keys(rb).filter((k) => rb[k] !== undefined)
  return clavesA.length === clavesB.length && clavesA.every((k) => iguales(ra[k], rb[k]))
}

// O(nodos), una vez por cambio aplicado. Sirve para el diseño solo y para lo que guarda el editor de la hoja (el diseño y lo editado de cada nodo).
export const hayCambiosEnElDiseno = <T extends object>(guardado: T, trabajo: T) =>
  guardado !== trabajo && !iguales(guardado, trabajo)
