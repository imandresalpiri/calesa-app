'use client'

import { useArchivoDeLaZona } from '@/shared/ui/use-archivo-de-la-zona'
import { subirComprobante, urlDelComprobante } from '../../../areas/compras/composicion.client'

// El comprobante de una compra en su zona: el archivo se sube al elegirlo (`subirComprobante` valida tipo y peso) y la ruta vuelve a quien lo usa; «Ver» abre una URL firmada de 60 s.
export function useComprobante(
  proyectoId: string,
  ruta: string,
  alCambiar: (ruta: string) => void,
) {
  return useArchivoDeLaZona({
    ruta,
    alCambiar,
    subir: (archivo) => subirComprobante(proyectoId, archivo),
    pedirUrl: urlDelComprobante,
    nombreSinElegir: 'Comprobante',
  })
}
