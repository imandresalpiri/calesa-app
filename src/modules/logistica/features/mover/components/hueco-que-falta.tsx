'use client'

import { useEffect } from 'react'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useParaMover } from '../hooks/use-para-mover'
import { QueFaltaConLaCadena } from './cadena/que-falta-con-la-cadena'
import { useCadenaDeLaPagina } from './cadena/proveedor-de-la-cadena'
import { QueFaltaDeHoy } from './que-falta-de-hoy'

// El hueco «Qué falta» del panel de la unidad (6.04): a dónde puede ir la unidad y, para cada destino, lo que esa fase le pide. Nace abierto (es lo primero que se mira para mover). Se relee al volver
// el foco a la ventana y cuando otro hueco avisa que cambió algo; sin realtime. Con `?ganada=si` (sólo un vehículo) es «La ganamos»: los destinos que no son la
// subasta, el primero abierto, y mover anota la subasta ganada. En la página de la unidad sigue a la fase que se toca en la cadena (`QueFaltaConLaCadena`) y le publica
// cada lectura al proveedor de la cadena (de ella salen los avisos de las tarjetas).
export function HuecoQueFalta({ unidad }: { unidad: UnidadAbierta }) {
  const paraMover = useParaMover(unidad)
  const cadena = useCadenaDeLaPagina()
  const publicar = cadena?.publicar
  const { lectura } = paraMover
  useEffect(() => {
    if (publicar && lectura.tipo === 'listo') publicar(lectura.dato)
  }, [publicar, lectura])
  if (cadena) {
    return <QueFaltaConLaCadena unidad={unidad} paraMover={paraMover} cadena={cadena} />
  }
  return <QueFaltaDeHoy unidad={unidad} paraMover={paraMover} />
}
