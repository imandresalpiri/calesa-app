// El borrador local de una plantilla de arte: lo que el editor anota en el navegador (`localStorage`, por plantilla) unos segundos después del
// último cambio, para no perder lo hecho sin red, al cerrar la pestaña o ante un conflicto. Al abrir, `queHacerConElBorrador()` decide si se
// repone solo, si se ofrece o si no hay nada. Puro.
import { z } from 'zod'
import { leerDocumento, type DocumentoDeArte } from '../documento'

export const ESPERA_DEL_BORRADOR_MS = 2000

export const esquemaDelBorrador = z.object({
  documento: z.unknown(),
  nombre: z.string(),
  // El `actualizado_en` de la plantilla sobre la que se hicieron los cambios.
  versionBase: z.string().min(1),
  escritoEn: z.string(),
})

export type BorradorDeArte = Omit<z.infer<typeof esquemaDelBorrador>, 'documento'> & {
  documento: DocumentoDeArte
}

export function claveDelBorrador(id: string): string {
  return `artes:borrador:${id}`
}

// Lo que quedó en el navegador, ya leído; un JSON roto, de otra forma o con un documento que no vale es como no tener borrador.
export function leerBorrador(crudo: string | null): BorradorDeArte | null {
  if (crudo === null) {
    return null
  }
  let json: unknown
  try {
    json = JSON.parse(crudo)
  } catch {
    return null
  }
  const leido = esquemaDelBorrador.safeParse(json)
  if (!leido.success) {
    return null
  }
  const documento = leerDocumento(leido.data.documento)
  return documento.ok ? { ...leido.data, documento: documento.data } : null
}

export type QueHacerConElBorrador = 'nada' | 'reponer' | 'ofrecer'

// Sin borrador, o con uno igual a lo guardado (`iguales`, lo compara quien llama): nada. Hecho sobre la versión que está guardada: se repone
// solo (y se avisa con «Descartar»). Sobre una versión vieja (otra persona guardó después): se ofrece, sin pisar lo de la otra persona.
export function queHacerConElBorrador({
  borrador,
  versionActual,
  iguales,
}: {
  borrador: BorradorDeArte | null
  versionActual: string
  iguales: boolean
}): QueHacerConElBorrador {
  if (borrador === null || iguales) {
    return 'nada'
  }
  return borrador.versionBase === versionActual ? 'reponer' : 'ofrecer'
}
