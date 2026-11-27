// Pedirle la cámara al navegador (`getUserMedia`, sólo video: nunca audio, nunca se graba ni se sube). Sin React: la usa `useCamara()`.

export type EstadoDeLaCamara = 'cargando' | 'lista' | 'negada' | 'sin_camara' | 'error'

export type CamaraAbierta = {
  estado: Exclude<EstadoDeLaCamara, 'cargando'>
  stream: MediaStream | null
  // La elegida ya no estaba y se abrió la primera.
  cayoALaPrimera: boolean
}

export const MENSAJE_DE_CAMARA_NEGADA = 'Sin cámara: revisa el permiso del navegador.'
export const MENSAJE_SIN_CAMARA = 'No se encontró una cámara.'
export const MENSAJE_DE_CAMARA_CON_ERROR = 'No se pudo abrir la cámara.'
export const AVISO_DE_CAMARA_QUE_NO_ESTA = 'La cámara elegida ya no está: se usa la primera.'

const nombreDelError = (error: unknown): string => (error instanceof DOMException ? error.name : '')

function sinStream(error: unknown): CamaraAbierta {
  const nombre = nombreDelError(error)
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return { estado: 'negada', stream: null, cayoALaPrimera: false }
  }
  if (
    nombre === 'NotFoundError' ||
    nombre === 'DevicesNotFoundError' ||
    nombre === 'OverconstrainedError'
  ) {
    return { estado: 'sin_camara', stream: null, cayoALaPrimera: false }
  }
  return { estado: 'error', stream: null, cayoALaPrimera: false }
}

const MENSAJES: Partial<Record<EstadoDeLaCamara, string>> = {
  negada: MENSAJE_DE_CAMARA_NEGADA,
  sin_camara: MENSAJE_SIN_CAMARA,
  error: MENSAJE_DE_CAMARA_CON_ERROR,
}

export const mensajeDeLaCamara = (estado: EstadoDeLaCamara): string | null =>
  MENSAJES[estado] ?? null

// La cámara elegida (`deviceId`) o la primera. Si la elegida ya no está, cae a la primera y lo dice en `cayoALaPrimera`.
export async function abrirLaCamara(deviceId: string | null): Promise<CamaraAbierta> {
  const medios = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices
  if (!medios || typeof medios.getUserMedia !== 'function') {
    return { estado: 'sin_camara', stream: null, cayoALaPrimera: false }
  }
  const pedir = (id: string | null) =>
    medios.getUserMedia({ video: id ? { deviceId: { exact: id } } : true, audio: false })
  try {
    return { estado: 'lista', stream: await pedir(deviceId), cayoALaPrimera: false }
  } catch (error) {
    const nombre = nombreDelError(error)
    if (deviceId && (nombre === 'OverconstrainedError' || nombre === 'NotFoundError')) {
      try {
        return { estado: 'lista', stream: await pedir(null), cayoALaPrimera: true }
      } catch (segundo) {
        return sinStream(segundo)
      }
    }
    return sinStream(error)
  }
}
