'use client'

import { useEffect, useState } from 'react'
import { MENSAJE_SESION_VENCIDA, MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'

export type Parte<T> =
  | { estado: 'sin_elegir' }
  | { estado: 'leyendo' }
  | { estado: 'listo'; dato: T }
  | { estado: 'error'; mensaje: string }

export type ImagenParaCompartir = { blob: Blob; url: string }

// Lo que se espera tras el último cambio de casillas antes de pedir: tildar tres seguidas arma una imagen, no tres.
export const ESPERA_ANTES_DE_PEDIR_MS = 250

const MENSAJE_INESPERADO_AL_ARMAR = 'No se pudo armar. Vuelve a intentarlo.'

type Resuelto<T> = { llave: string; parte: Parte<T> }

// Pide a las rutas de `src/app/(app)/tipos-de-cambio/`: lo que dice la respuesta si no salió bien (el servidor lo escribe para la persona), la sesión vencida si la
// respuesta es la pantalla de ingreso (el proxy redirige) y «sin conexión» si el pedido no llegó.
async function pedir(direccion: string, tipo: string, senal: AbortSignal): Promise<Response> {
  let respuesta: Response
  try {
    respuesta = await fetch(direccion, { signal: senal, cache: 'no-store' })
  } catch (error) {
    if (senal.aborted) {
      throw error
    }
    throw new Error(MENSAJE_SIN_CONEXION)
  }
  if (respuesta.redirected) {
    throw new Error(MENSAJE_SESION_VENCIDA)
  }
  if (!respuesta.ok) {
    const dicho = (await respuesta.text().catch(() => '')).trim()
    throw new Error(respuesta.status < 500 && dicho !== '' ? dicho : MENSAJE_INESPERADO_AL_ARMAR)
  }
  if (!(respuesta.headers.get('content-type') ?? '').startsWith(tipo)) {
    throw new Error(MENSAJE_INESPERADO_AL_ARMAR)
  }
  return respuesta
}

// Una parte (el texto o la imagen) de lo que se comparte: se pide al elegir los tipos (con espera) y otra vez con `reintentar()`. Lo leído queda
// atado a la llave de lo que se pidió, así que mientras llega lo nuevo se ve «leyendo» y nunca lo de otra elección. `listo` da lo que se recibió.
function useParte<T>(
  ids: readonly string[],
  tipo: string,
  ruta: string,
  leer: (respuesta: Response) => Promise<{ dato: T; liberar?: () => void }>,
) {
  const elegidos = ids.join(',')
  const [intento, setIntento] = useState(0)
  const [resuelto, setResuelto] = useState<Resuelto<T> | null>(null)
  const llave = `${elegidos}#${String(intento)}`

  useEffect(() => {
    if (elegidos === '') {
      return
    }
    const control = new AbortController()
    let liberar: (() => void) | undefined
    const espera = setTimeout(() => {
      void (async () => {
        try {
          const respuesta = await pedir(
            `${ruta}${ruta.includes('?') ? '&' : '?'}ids=${encodeURIComponent(elegidos)}`,
            tipo,
            control.signal,
          )
          const leido = await leer(respuesta)
          liberar = leido.liberar
          if (control.signal.aborted) {
            liberar?.()
            return
          }
          setResuelto({ llave, parte: { estado: 'listo', dato: leido.dato } })
        } catch (error) {
          if (control.signal.aborted) {
            return
          }
          const mensaje = error instanceof Error ? error.message : MENSAJE_INESPERADO_AL_ARMAR
          setResuelto({ llave, parte: { estado: 'error', mensaje } })
        }
      })()
    }, ESPERA_ANTES_DE_PEDIR_MS)
    return () => {
      clearTimeout(espera)
      control.abort()
      liberar?.()
    }
    // `llave` lleva lo elegido y el intento; `leer`, `ruta` y `tipo` son constantes de módulo.
  }, [elegidos, llave, leer, ruta, tipo])

  const parte: Parte<T> =
    elegidos === ''
      ? { estado: 'sin_elegir' }
      : resuelto?.llave === llave
        ? resuelto.parte
        : { estado: 'leyendo' }
  return { parte, reintentar: () => setIntento((n) => n + 1) }
}

const leerTexto = async (respuesta: Response) => ({ dato: await respuesta.text() })

const leerImagen = async (respuesta: Response) => {
  const blob = await respuesta.blob()
  const url = URL.createObjectURL(blob)
  return {
    dato: { blob, url } satisfies ImagenParaCompartir,
    liberar: () => {
      URL.revokeObjectURL(url)
    },
  }
}

const SIN_ELEGIR: readonly string[] = []
const SIN_MONEDA = '?sin-moneda=1'

// El texto y la imagen de los tipos elegidos, cada uno por su lado: si la imagen falla, el texto sigue disponible (y al revés). Los pide al servidor, que
// los arma con lo mismo (la empresa, el momento en su zona, los tipos, la leyenda). Con el Modo Live (`live`) pide además la vista sin moneda
// (`?sin-moneda=1`): `textoALaVista` e `imagenALaVista` son lo que se muestra; `texto` e `imagen`, lo que se copia y se comparte, siempre con su moneda.
export function useParaCompartir(ids: readonly string[], live: boolean) {
  const texto = useParte(ids, 'text/plain', '/tipos-de-cambio/texto', leerTexto)
  const imagen = useParte(ids, 'image/png', '/tipos-de-cambio/imagen', leerImagen)
  const idsSinMoneda = live ? ids : SIN_ELEGIR
  const textoSin = useParte(
    idsSinMoneda,
    'text/plain',
    `/tipos-de-cambio/texto${SIN_MONEDA}`,
    leerTexto,
  )
  const imagenSin = useParte(
    idsSinMoneda,
    'image/png',
    `/tipos-de-cambio/imagen${SIN_MONEDA}`,
    leerImagen,
  )
  const textoALaVista = live && ids.length > 0 ? textoSin : texto
  const imagenALaVista = live && ids.length > 0 ? imagenSin : imagen
  return {
    texto: texto.parte,
    imagen: imagen.parte,
    textoALaVista: textoALaVista.parte,
    imagenALaVista: imagenALaVista.parte,
    reintentarTexto: () => {
      texto.reintentar()
      if (live) textoSin.reintentar()
    },
    reintentarImagen: () => {
      imagen.reintentar()
      if (live) imagenSin.reintentar()
    },
  }
}
