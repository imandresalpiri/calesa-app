'use client'

import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerCamposDelOrigen } from '../../../areas/formula/composicion.client'

// Los campos propios del origen (clave y tipo), leídos al abrir «Tipo de celda › Dato del vehículo» (las comunes no se leen: son `CAMPOS_COMUNES`).
export function useCamposDelOrigen(origenId: string) {
  return useLecturaAlMontar(() => leerCamposDelOrigen(origenId), origenId)
}
