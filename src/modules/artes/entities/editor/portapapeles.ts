// El portapapeles del editor de artes: lo copiado queda en `localStorage` (`artes:portapapeles`), así se pega en otra plantilla. Se lee con
// el esquema de la capa y del grupo: algo roto o de otra forma es como no haber copiado nada. Las imágenes las revisa la base al guardar.
// Puro.
import { z } from 'zod'
import { esquemaDeCapa, esquemaDelGrupo, MAXIMO_DE_CAPAS_POR_PAGINA } from '../documento'
import type { Portapapeles } from './acciones-de-capas'

export const CLAVE_DEL_PORTAPAPELES = 'artes:portapapeles'

const esquemaDelPortapapeles = z.object({
  capas: z.array(esquemaDeCapa).min(1).max(MAXIMO_DE_CAPAS_POR_PAGINA),
  grupos: z.array(esquemaDelGrupo),
})

export function escribirPortapapeles(portapapeles: Portapapeles): string {
  return JSON.stringify(portapapeles)
}

export function leerPortapapeles(crudo: string | null): Portapapeles | null {
  if (crudo === null) {
    return null
  }
  let json: unknown
  try {
    json = JSON.parse(crudo)
  } catch {
    return null
  }
  const leido = esquemaDelPortapapeles.safeParse(json)
  return leido.success ? leido.data : null
}
