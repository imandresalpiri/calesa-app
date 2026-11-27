// Ver, descargar o previsualizar un documento desde el navegador (6.06-1): URL firmada sobre el bucket privado `documentos`. Se pide al tocar, nunca al leer la lista; sólo las miniaturas de las
// imágenes livianas se piden al dibujarse la lista, **todas en una llamada** (`createSignedUrls`). La policy de lectura de `storage.objects` deja leer el objeto a quien ve alguna fila viva de esa ruta.
import { fallo, MENSAJE_SIN_CONEXION, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'

const BUCKET = 'documentos'
const SEGUNDOS_DE_LA_URL = 60
// La vista previa se queda abierta mientras se revisa el archivo (y el visor del navegador puede volver a pedir partes del PDF): vive más que un clic en «Ver».
const SEGUNDOS_DE_LA_VISTA_PREVIA = 600
const SEGUNDOS_DE_LA_MINIATURA = 600

export const NO_SE_PUDO_ABRIR_EL_DOCUMENTO = 'No se pudo abrir el documento. Prueba de nuevo.'

export async function urlDelDocumento(
  ruta: string,
  {
    descargar,
    paraLaVistaPrevia = false,
  }: { descargar: { nombre: string } | null; paraLaVistaPrevia?: boolean },
): Promise<Resultado<string>> {
  const { data, error } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrl(
      ruta,
      paraLaVistaPrevia ? SEGUNDOS_DE_LA_VISTA_PREVIA : SEGUNDOS_DE_LA_URL,
      descargar ? { download: descargar.nombre } : undefined,
    )
  if (error) {
    return fallo(
      'inesperado',
      window.navigator.onLine ? NO_SE_PUDO_ABRIR_EL_DOCUMENTO : MENSAJE_SIN_CONEXION,
    )
  }
  return ok(data.signedUrl)
}

// Las URL de las miniaturas de una lista, en **una sola llamada** (nunca una por fila). Devuelve ruta → URL de las que se pudieron firmar; una que falta se queda con su icono. Con `rutas` vacío no
// llama a nada. Un fallo entero es un error: la lista se ve igual, con iconos.
export async function urlsDeLasMiniaturas(
  rutas: readonly string[],
): Promise<Resultado<Record<string, string>>> {
  if (rutas.length === 0) return ok({})
  const { data, error } = await createClient()
    .storage.from(BUCKET)
    .createSignedUrls([...rutas], SEGUNDOS_DE_LA_MINIATURA)
  if (error) {
    return fallo(
      'inesperado',
      window.navigator.onLine ? NO_SE_PUDO_ABRIR_EL_DOCUMENTO : MENSAJE_SIN_CONEXION,
    )
  }
  const urls: Record<string, string> = {}
  for (const fila of data) {
    if (fila.path !== null && fila.signedUrl) urls[fila.path] = fila.signedUrl
  }
  return ok(urls)
}
