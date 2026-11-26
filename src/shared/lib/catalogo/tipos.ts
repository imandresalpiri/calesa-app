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
