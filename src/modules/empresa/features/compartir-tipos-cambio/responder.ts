import type { CodigoError } from '@/shared/lib/errores'
import { armarTextoParaCompartir, idsParaCompartir } from '../../entities/compartir-tipos-cambio'
import type { DibujanteDeImagen, LectorParaCompartir } from '../../entities/repositorios'

export type FormatoParaCompartir = 'imagen' | 'texto'

type Puertos = { leer: LectorParaCompartir; dibujar: DibujanteDeImagen }

// Nunca se guarda ni se comparte por caché: lleva cifras y la hora de ahora.
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

const INVALIDO = 'Elige de 1 a 30 tipos de cambio.'
const NO_SE_PUDO = 'No se pudo armar lo que se comparte. Vuelve a intentarlo.'

const ESTADO_DE: Partial<Record<CodigoError, number>> = {
  no_encontrado: 404,
  sin_permiso: 403,
  no_autenticado: 401,
}

function texto(cuerpo: string, status: number): Response {
  return new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })
}

// Responde lo que el popover de la barra pide para compartir: el texto para WhatsApp o la imagen PNG de los tipos elegidos (`ids`: la lista de la URL, ya
// leída del `searchParams`), con la sesión de quien pide. Quien llama pidió la sesión antes. Los dos formatos salen de la misma lectura. `sinMoneda`: la vista del
// Modo Live (`?sin-moneda=1`), los valores sin su moneda.
export async function responderParaCompartir(
  formato: FormatoParaCompartir,
  ids: string | null,
  { leer, dibujar }: Puertos,
  { sinMoneda = false }: { sinMoneda?: boolean } = {},
): Promise<Response> {
  const elegidos = idsParaCompartir(ids)
  if (elegidos === null) {
    return texto(INVALIDO, 400)
  }
  const lectura = await leer(elegidos)
  if (!lectura.ok) {
    const { codigo, mensaje } = lectura.error
    const status = ESTADO_DE[codigo]
    return status === undefined ? texto(NO_SE_PUDO, 500) : texto(mensaje, status)
  }
  const datos = sinMoneda ? { ...lectura.data, sinMoneda } : lectura.data
  if (formato === 'texto') {
    return texto(armarTextoParaCompartir(datos), 200)
  }
  const imagen = await dibujar(datos)
  if (!imagen.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  return new Response(imagen.data as BodyInit, {
    status: 200,
    headers: { 'Content-Type': 'image/png', ...SIN_GUARDAR },
  })
}
