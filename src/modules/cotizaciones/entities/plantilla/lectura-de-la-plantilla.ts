// Lo que lee el editor de la plantilla de la tarjeta de un origen (4.19-3a): el borrador y la publicada ya leídos en una de sus dos formas, y el contexto con el que
// `validarPlantilla()` las juzga (la fórmula publicada del origen y el catálogo de tonos). Reglas puras, sin I/O: las consultas están en `infra/plantilla/`.
import { z } from 'zod'
import { TOPE_DE_COLORES } from '../colores'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { formaDeCuadricula } from './forma-de-cuadricula'
import { formaDePlantilla, type Plantilla } from './forma-de-plantilla'
import type { DefinicionParaPlantilla, DisenoParaPlantilla } from './nodos-de-plantilla'
import { esDeLaCuadricula, type ContextoDePlantilla } from './validar-plantilla'

// El catálogo de colores (`tonos`) tiene un tope en la base (`_tonos_tope()`, 48): no deja crear el 49.º, así que se lee entero y no hay «Ver más» ni aviso de tope.
export const TOPE_DE_TONOS = TOPE_DE_COLORES

// Los colores (4.19-4) son los de `tonos`: el hex que pinta la tarjeta y las versiones de la hoja, como texto. La vista previa arma la tarjeta con el hex y la
// tinta clara (`coloresDeLaTarjeta()`) y descarta un color sin hex.
export type ColoresDelTonoDelCatalogo = {
  readonly fondo: string
  readonly borde: string
  readonly tinta: string
}
export type TonoDelCatalogo = {
  readonly clave: string
  readonly nombre: string
  readonly hex?: string
  readonly claro?: ColoresDelTonoDelCatalogo
  readonly oscuro?: ColoresDelTonoDelCatalogo
}

// Lo que una versión guardada tiene: una plantilla de la forma 1 (la de grupos, que el editor convierte al abrirla), una cuadrícula (la forma 2, la que el editor
// escribe) o, si ya no tiene ninguna de las dos formas, el motivo (el editor no la dibuja a medias).
export type ContenidoDeLaVersion =
  | { readonly forma: 1; readonly plantilla: Plantilla }
  | { readonly forma: 2; readonly cuadricula: PlantillaEnCuadricula }
  | { readonly motivo: string }

// Una plantilla del origen (el borrador o la publicada). Las dos horas son el texto que da la base, con sus microsegundos: la versión esperada de guardar, publicar y
// descartar es ese texto y nunca pasa por `Date`.
export type VersionDePlantilla = {
  readonly id: string
  readonly version: number | null
  readonly nota: string | null
  readonly actualizadoEn: string
  readonly publicadoEn: string | null
  readonly contenido: ContenidoDeLaVersion
}

export type FilaDeVersionDePlantilla = {
  readonly id: string
  readonly version: number | null
  readonly nota: string | null
  readonly actualizadoEn: string
  readonly publicadoEn: string | null
  readonly definicion: unknown
}

// De la fórmula publicada se lee sólo lo que mira `validarPlantilla()` (los nodos con su grupo y su salida, los buckets, los grupos, y del diseño los modos y los secundarios
// de la tarjeta): ya la validó la base al publicarla, y leerla con el Zod entero de la fórmula ataría la plantilla a cada cambio de la fórmula.
export const esquemaDefinicionParaPlantilla = z.looseObject({
  nodos: z.array(
    z.looseObject({
      id: z.string(),
      grupo: z.string().nullish(),
      salida: z.string().nullish(),
      etiqueta: z.string().nullish(),
      // Lo que mira la conversión a la cuadrícula para la vista previa: la descripción y la variante con sus títulos.
      descripcion: z.string().nullish(),
      tipo: z.string().nullish(),
      // El par porcentaje-monto: lo que la cuadrícula puede mostrar como «porcentaje».
      op: z.string().nullish(),
      pct: z.string().nullish(),
      opciones: z.array(z.looseObject({ clave: z.string(), titulo: z.string() })).nullish(),
      // Los «Decimales» de la celda: la tarjeta de trabajo los dibuja como la de una cotización.
      decimales: z.number().nullish(),
    }),
  ),
  buckets: z.record(z.string(), z.string()).optional(),
  grupos: z
    .array(
      z.looseObject({
        id: z.string(),
        bucket: z.string().nullish(),
        etiqueta: z.string().nullish(),
        tono: z.string().nullish(),
        plazo: z.unknown().optional(),
      }),
    )
    .optional(),
})
export const esquemaDisenoParaPlantilla = z.looseObject({
  cabecera: z
    .looseObject({
      modos: z.array(
        z.looseObject({
          clave: z.string().nullish(),
          nombre: z.string().nullish(),
          buckets: z.array(z.looseObject({ bucket: z.string(), nodo: z.string() })),
        }),
      ),
    })
    .optional(),
  tarjeta_total: z.looseObject({ secundarios: z.array(z.string()) }).optional(),
})

export type FormulaParaLaPlantilla = {
  readonly id: string
  readonly version: number
  readonly definicion: DefinicionParaPlantilla
  readonly diseno: DisenoParaPlantilla | null
  readonly visibilidad: Readonly<Record<string, unknown>> | null
}

export type PlantillaDelOrigen = {
  // La fórmula de trabajo del origen, de la que son la plantilla y la fórmula leídas (nula si el origen todavía no tiene: no hay plantilla ni fórmula).
  readonly formulaDelOrigenId: string | null
  readonly publicada: VersionDePlantilla | null
  readonly borrador: VersionDePlantilla | null
  // La fórmula publicada de esa fórmula del origen: sin ella no hay contra qué validar (la base lo dice igual al publicar: `formula_sin_publicar`).
  readonly formula: { readonly id: string; readonly version: number } | null
  // Lo que se le pasa tal cual a `validarPlantilla()`; nulo sin fórmula.
  readonly contexto: ContextoDePlantilla | null
  readonly tonos: readonly TonoDelCatalogo[]
}

// Nunca lanza: lo guardado que no pasa la forma es `{ motivo }` con el mensaje del rechazo. Una cuadrícula guardada ya la midió la base: no se vuelve a medir contra
// los 24 KiB (un espejo que contara un byte de más la dejaría sin abrir).
export function versionDePlantilla(fila: FilaDeVersionDePlantilla): VersionDePlantilla {
  const comun = {
    id: fila.id,
    version: fila.version,
    nota: fila.nota,
    actualizadoEn: fila.actualizadoEn,
    publicadoEn: fila.publicadoEn,
  }
  if (esDeLaCuadricula(fila.definicion)) {
    const cuadricula = formaDeCuadricula(fila.definicion, { conTope: false })
    return {
      ...comun,
      contenido: cuadricula.ok
        ? { forma: 2, cuadricula: cuadricula.plantilla }
        : { motivo: cuadricula.error.mensaje },
    }
  }
  const forma = formaDePlantilla(fila.definicion)
  return {
    ...comun,
    contenido: forma.ok
      ? { forma: 1, plantilla: forma.plantilla }
      : { motivo: forma.error.mensaje },
  }
}

export function contextoDeValidacion(
  formula: FormulaParaLaPlantilla | null,
  tonos: readonly TonoDelCatalogo[],
): ContextoDePlantilla | null {
  if (formula === null) return null
  return {
    definicion: formula.definicion,
    diseno: formula.diseno,
    visibilidad: formula.visibilidad,
    tonos: tonos.map((t) => t.clave),
  }
}
