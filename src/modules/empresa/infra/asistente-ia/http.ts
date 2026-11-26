import 'server-only'
import type { PedidoArmado } from '../../entities/asistente-ia/pedido'
import {
  interpretarRespuesta,
  seCuentaComoUso,
  type RespuestaDelProveedor,
} from '../../entities/asistente-ia/respuesta'

export const ESPERA_DEL_ASISTENTE_MS = 20_000

export type LlamadaAlProveedor = {
  urlBase: string
  clave: string
  modelo: string
  pedido: PedidoArmado
  esperaMs?: number
}

// Lo que contestó y si respondió 2xx (entonces se cuenta un uso).
export type ContestoElProveedor = { respuesta: RespuestaDelProveedor; respondio: boolean }

const esTiempoAgotado = (error: unknown) =>
  error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

// `POST <url_base>/chat/completions`, la forma compatible con OpenAI. La clave va sólo en la cabecera: sin seguir redirecciones (`redirect:
// 'error'`) no viaja a otro host. Nunca se registra la clave, las cabeceras, el cuerpo ni el error del `fetch`: el log lleva el host y el código.
export async function pedirAlProveedor({
  urlBase,
  clave,
  modelo,
  pedido,
  esperaMs = ESPERA_DEL_ASISTENTE_MS,
}: LlamadaAlProveedor): Promise<ContestoElProveedor> {
  const destino = `${urlBase.replace(/\/+$/, '')}/chat/completions`
  const host = new URL(destino).host
  try {
    const respuesta = await fetch(destino, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
      body: JSON.stringify({
        model: modelo,
        messages: pedido.mensajes,
        max_tokens: pedido.maxTokens,
        temperature: pedido.temperatura,
        stream: false,
      }),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(esperaMs),
    })
    const respondio = seCuentaComoUso(respuesta.status)
    if (!respondio) {
      await respuesta.body?.cancel()
      console.warn('El asistente de IA no aceptó el pedido', { host, codigo: respuesta.status })
      return { respuesta: interpretarRespuesta(respuesta.status, null), respondio }
    }
    const cuerpo: unknown = await respuesta.json().catch((error: unknown) => {
      if (esTiempoAgotado(error)) throw error
      return null
    })
    return { respuesta: interpretarRespuesta(respuesta.status, cuerpo), respondio }
  } catch (error) {
    const sinTiempo = esTiempoAgotado(error)
    console.warn('El asistente de IA no respondió', { host, motivo: sinTiempo ? 'tiempo' : 'red' })
    return {
      respuesta: { ok: false, falla: sinTiempo ? 'sin_tiempo' : 'no_disponible' },
      respondio: false,
    }
  }
}
