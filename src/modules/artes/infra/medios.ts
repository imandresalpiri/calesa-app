import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { EXTENSIONES_DE_MEDIO, etiquetaDeLaRuta, type ExtensionDeMedio } from '../entities/medios'

// Los archivos que dibuja el lienzo del editor de artes, leídos en el servidor con la sesión de quien pide (la RLS decide; nunca la secret
// key): una imagen de la biblioteca (bucket privado `artes`) y un logo de la empresa (bucket público `marca`, por la ruta que da `leerLogos()`,
// nunca por una que llega en el pedido). Nulo: no existe, no se ve o el objeto no está.

export type ArchivoDelLienzo = { cuerpo: Blob; extension: ExtensionDeMedio; etiqueta: string }

const NO_SE_PUDO = 'No se pudo leer la imagen.'
const esquemaDeLaFila = z.object({ ruta: z.string().min(1), tipo: z.enum(EXTENSIONES_DE_MEDIO) })

async function bajar(
  bucket: 'artes' | 'marca',
  ruta: string,
  extension: ExtensionDeMedio,
): Promise<Resultado<ArchivoDelLienzo | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(bucket).download(ruta)
  if (error) {
    // Storage responde 400 o 404 cuando el objeto no está o la policy no lo deja ver: es «no está», no una falla.
    return error.status === 400 || error.status === 404
      ? ok(null)
      : fallo('inesperado', NO_SE_PUDO, error.message)
  }
  return ok({ cuerpo: data, extension, etiqueta: etiquetaDeLaRuta(ruta) })
}

// La imagen `id` de la biblioteca, si quien pide la ve. Por la PK de `artes_imagenes`.
export async function archivoDeLaImagen(id: string): Promise<Resultado<ArchivoDelLienzo | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artes_imagenes')
    .select('ruta, tipo')
    .eq('id', id)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const fila = esquemaDeLaFila.safeParse(data)
  if (!fila.success) {
    return fallo('inesperado', NO_SE_PUDO)
  }
  return bajar('artes', fila.data.ruta, fila.data.tipo)
}

// El logo guardado en `ruta` del bucket `marca` (la ruta sale de la lista de logos de la empresa).
export function archivoDelLogo(
  ruta: string,
  extension: ExtensionDeMedio,
): Promise<Resultado<ArchivoDelLienzo | null>> {
  return bajar('marca', ruta, extension)
}
