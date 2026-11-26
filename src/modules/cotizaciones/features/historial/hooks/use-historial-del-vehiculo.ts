'use client'

import { useEffect, useEffectEvent } from 'react'
import { usePaginasDelHistorial } from './use-paginas-del-historial'

// El historial del modal «Historial de cotizaciones»: lee la primera página al montarse (el modal se monta al abrirse por primera vez y queda
// montado: cerrar y volver a abrir no vuelve a leer). Las páginas son las de `usePaginasDelHistorial`.
export function useHistorialDelVehiculo(vehiculoId: string) {
  const paginas = usePaginasDelHistorial({ vehiculo: vehiculoId })
  const leerAlMontar = useEffectEvent(paginas.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  return paginas
}
