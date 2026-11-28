'use client'

import type { AccionDeMenu } from '@/shared/ui/lista'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  lineasDeLaImagen,
  type ClaveDeAccionDeImagen,
} from '../../../entities/acciones-de-la-imagen'
import {
  CLAVE_DE_LA_IMAGEN,
  PANEL_QUITAR_IMAGEN,
  PANEL_RENOMBRAR_IMAGEN,
} from '../../../entities/paneles'
import type { QuienMira } from '../../../entities/permisos-de-artes'
import type { ImagenDeArte } from '../../../entities/tipos'
import { useFilaPorUrl } from '../../plantillas/hooks/use-fila-por-url'
import type { ImagenesCargadas } from './use-imagenes'

export const MENSAJE_DE_IMAGEN_QUE_NO_ESTA = 'Esa imagen ya no está en la biblioteca.'

// El «⋯» de cada imagen (la lista es de `lineasDeLaImagen()`): las dos líneas abren algo encima por la URL, `?panel=renombrar|quitar&imagen=<id>`.
export function useAccionesDeLasImagenes({
  quien,
  imagenes,
}: {
  quien: QuienMira
  imagenes: ImagenesCargadas
}) {
  const renombrar = useFilaPorUrl(
    usePanelPorUrl(PANEL_RENOMBRAR_IMAGEN, [CLAVE_DE_LA_IMAGEN]),
    CLAVE_DE_LA_IMAGEN,
    imagenes.porId,
    MENSAJE_DE_IMAGEN_QUE_NO_ESTA,
  )
  const quitar = useFilaPorUrl(
    usePanelPorUrl(PANEL_QUITAR_IMAGEN, [CLAVE_DE_LA_IMAGEN]),
    CLAVE_DE_LA_IMAGEN,
    imagenes.porId,
    MENSAJE_DE_IMAGEN_QUE_NO_ESTA,
  )
  const abrir: Record<ClaveDeAccionDeImagen, (id: string) => void> = {
    renombrar: renombrar.abrir,
    quitar: quitar.abrir,
  }
  return {
    menuDe: (imagen: ImagenDeArte): AccionDeMenu[] =>
      lineasDeLaImagen(quien, imagen).map((linea) =>
        linea.tipo === 'accion'
          ? {
              ...linea,
              despuesDeCerrar: true,
              alElegir: () => {
                abrir[linea.clave](imagen.id)
              },
            }
          : linea,
      ),
    renombrar,
    quitar,
  }
}
