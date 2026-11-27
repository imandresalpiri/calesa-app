'use client'

import { diferido } from '@/shared/ui/diferido'
import { useLive } from '@/shared/ui/live'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import type { DatosDeQuienPresenta, VentanaDeCamara } from '../../../entities/ventana-de-camara'

// La ventana y su cámara no viajan con la pantalla: se piden sólo cuando hay un Live encendido en una pantalla de escritorio.
const VentanaDiferida = diferido(() => import('./ventana-de-camara').then((m) => m.VentanaDeCamara))

// Desde 1024 px de ancho (en el celular y en la tableta vertical sólo se ve el marco).
export const CONSULTA_DE_ESCRITORIO_DE_LA_VENTANA = '(min-width: 1024px)'

type Props = {
  // Lo que el servidor leyó con el Live encendido; sin él (el Live se acaba de encender y falta que el servidor vuelva a dibujar) no hay ventana todavía.
  ventana?: { inicial: VentanaDeCamara; datos: DatosDeQuienPresenta }
}

// La puerta de la ventana de cámara del Live: con el Live encendido (la clase de <html>, `useLive()`) y en escritorio, la pide; si no, no dibuja nada y
// su código no se descarga. Al apagar el Live la ventana se desmonta y la cámara se apaga (se detienen sus pistas).
export function PuertaDeLaVentana({ ventana }: Props) {
  const { live } = useLive()
  const escritorio = useConsultaDeMedios(CONSULTA_DE_ESCRITORIO_DE_LA_VENTANA)
  if (!live || !escritorio || !ventana) {
    return null
  }
  return <VentanaDiferida inicial={ventana.inicial} datos={ventana.datos} />
}
