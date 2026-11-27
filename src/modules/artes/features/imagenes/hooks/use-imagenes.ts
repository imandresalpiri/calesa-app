'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ImagenDeArte, PaginaDeArtes } from '../../../entities/tipos'
import { useCargaDeArtes } from '../../plantillas/hooks/use-carga-de-artes'
import { leerMasImagenesDeArte } from '../actions/leer-mas-imagenes'

const NO_SE_LEYERON = 'No se pudieron cargar las imágenes.'

// La biblioteca de imágenes cargada: las de la empresa y las personales de quien mira (RLS), de la más reciente a la más vieja. «Ver más» lee
// en el servidor (`leerMasImagenesDeArte`).
export function useImagenes({ inicial }: { inicial: PaginaDeArtes<ImagenDeArte> }) {
  const mas = useAction(leerMasImagenesDeArte)
  return useCargaDeArtes({
    inicial,
    mensaje: NO_SE_LEYERON,
    leerMas: (cursor) => enviarAccion(mas.executeAsync({ cursor }), NO_SE_LEYERON),
  })
}

export type ImagenesCargadas = ReturnType<typeof useImagenes>
