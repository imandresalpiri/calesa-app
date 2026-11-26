import { z } from 'zod'

// Un elemento de un catálogo que se elige (un grupo de campos, una categoría de FAQ): nombre único por contexto, orden de los
// bloques y si se ofrece para elegir. `actualizadoEn` es la versión que pide toda edición (`PT409`).
export type ElementoDeCatalogo = {
  id: string
  nombre: string
  orden: number
  activo: boolean
  actualizadoEn: string
}

// Cuántos elementos lee un catálogo (pide uno más para saber si hay más): la base rechaza el 101.
export const TOPE_DE_CATALOGO = 100

// Lo que se lee de una tabla de catálogo, en el orden de `elementoDeCatalogoDesde()`.
export const COLUMNAS_DE_CATALOGO = 'id, nombre, orden, activo, actualizado_en'

// Un catálogo leído con su tope (`limit` + 1 y `cortarAlTope()`).
export type CatalogoLeido = { lista: ElementoDeCatalogo[]; hayMas: boolean }

const fila = z.object({
  id: z.guid(),
  nombre: z.string(),
  orden: z.number(),
  activo: z.boolean(),
  actualizado_en: z.string(),
})

export type FilaDeCatalogo = z.input<typeof fila>

export function elementoDeCatalogoDesde(datos: unknown): ElementoDeCatalogo {
  const { actualizado_en, ...resto } = fila.parse(datos)
  return { ...resto, actualizadoEn: actualizado_en }
}
