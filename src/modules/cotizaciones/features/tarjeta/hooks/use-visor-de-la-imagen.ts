'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { CLAVE_DEL_VISOR } from '@/shared/ui/visor-de-imagenes'
import {
  claveDelVisorDeLaImagen,
  esClaveDelVisorDeLaImagen,
  type LugarDeLaImagen,
} from '../../../entities/tarjeta/clave-del-visor-de-la-imagen'

// El visor de la imagen de la tarjeta: su clave en `?visor=` (la de la URL si la nombra, la de hoy o la de antes: el visor se abre con la que dice), si ya hay que
// montarlo (un clic o la URL) y los pedidos de abrirlo (cada clic suma uno).
export function useVisorDeLaImagen({
  cotizacionId,
  lugar,
}: {
  cotizacionId: string
  lugar: LugarDeLaImagen
}) {
  const [pedidos, setPedidos] = useState(0)
  const [enLaUrl] = useQueryState(CLAVE_DEL_VISOR, parseAsString)
  const laNombraLaUrl = esClaveDelVisorDeLaImagen(enLaUrl, cotizacionId, lugar)
  const clave =
    laNombraLaUrl && enLaUrl !== null ? enLaUrl : claveDelVisorDeLaImagen(cotizacionId, lugar)
  const montar = useAbiertoAlgunaVez(pedidos > 0 || laNombraLaUrl)
  return {
    clave,
    montar,
    pedidos,
    abrir: () => {
      setPedidos((n) => n + 1)
    },
  }
}
