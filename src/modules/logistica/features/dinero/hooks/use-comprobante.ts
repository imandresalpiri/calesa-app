'use client'

import { useArchivoDeLaZona } from '@/shared/ui/use-archivo-de-la-zona'
import { subirComprobante, urlDelComprobante } from '../../../areas/dinero/composicion.client'

// El comprobante de un gasto o pago en su zona: el archivo se sube al elegirlo (`subirComprobante` valida tipo y peso) y la ruta vuelve a quien lo usa; «Ver» abre una URL firmada de 60 s.
export function useComprobante(unidadId: string, ruta: string, alCambiar: (ruta: string) => void) {
  return useArchivoDeLaZona({
    ruta,
    alCambiar,
    subir: (archivo) => subirComprobante(unidadId, archivo),
    pedirUrl: urlDelComprobante,
    nombreSinElegir: 'Comprobante',
  })
}
