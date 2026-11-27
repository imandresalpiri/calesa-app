'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { RespuestaDeLogos } from '../../../entities/repositorios'
import type { UsosDelLogo, VarianteDelLogo } from '../../../entities/logos'
import { crearLogo, ordenarLogos, quitarLogo, renombrarLogo } from '../actions/escribir-logos'
import { usosDelLogo } from '../actions/usos-del-logo'

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

export type DatosDelLogoNuevo = {
  id: string
  nombre: string
  ruta: string
  tipo: 'svg' | 'png' | 'webp' | 'jpg'
  ancho: number
  alto: number
}

type Pedido = Parameters<typeof enviarAccion<RespuestaDeLogos>>[0]

const comoEnvio = (pedido: Pedido) => enviarAccion<RespuestaDeLogos>(pedido, MENSAJE_DE_VALIDACION)

// Las Server Actions de las variantes del logo, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor).
// Renombrar y quitar mandan la versión que se tenía en pantalla.
export function usePedidosDeLogos() {
  const crear = useAction(crearLogo)
  const renombrar = useAction(renombrarLogo)
  const ordenar = useAction(ordenarLogos)
  const quitar = useAction(quitarLogo)
  const usos = useAction(usosDelLogo)
  return {
    crear: (datos: DatosDelLogoNuevo) => comoEnvio(crear.executeAsync(datos)),
    renombrar: (logo: VarianteDelLogo, nombre: string) =>
      comoEnvio(
        renombrar.executeAsync({
          id: logo.id,
          actualizadoEnEsperado: logo.actualizadoEn ?? '',
          nombre,
        }),
      ),
    ordenar: (ids: readonly string[]) => comoEnvio(ordenar.executeAsync({ ids: [...ids] })),
    quitar: (logo: VarianteDelLogo) =>
      comoEnvio(
        quitar.executeAsync({ id: logo.id, actualizadoEnEsperado: logo.actualizadoEn ?? '' }),
      ),
    usos: async (id: string): Promise<UsosDelLogo | null> => {
      const envio = await enviarAccion<UsosDelLogo>(
        usos.executeAsync({ id }),
        MENSAJE_DE_VALIDACION,
      )
      return envio.ok ? envio.data : null
    },
  }
}
