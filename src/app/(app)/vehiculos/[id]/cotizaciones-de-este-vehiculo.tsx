'use client'

import { useRouter } from 'next/navigation'
import { useTransition, type ComponentProps } from 'react'
import {
  ID_DE_LA_RANURA_DE_COMPARAR,
  TarjetasDelVehiculo,
} from '@/modules/cotizaciones/pantallas/aprobada-fichas'
import { TarjetasDeLaFicha } from '@/modules/cotizaciones/pantallas/listado-fichas'
import { ImagenDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta-imagen'
import { useAbrirCompartirDeLaFila } from '@/modules/cotizaciones/pantallas/tarjeta-compartir'

type Props = {
  vehiculo: { id: string; titulo: string }
  // Los orígenes donde quien mira aprueba (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor).
  aprobarEn: ComponentProps<typeof TarjetasDelVehiculo>['aprobarEn']
  volverA: string
}

// La fila de tarjetas del listado con lo del área `tarjeta` ya unido (la imagen de la tarjeta y «Compartir»; su diálogo ya está en los paneles de la ficha).
// Va fuera de `CotizacionesDeEsteVehiculo` para que su identidad no cambie en cada dibujo.
function TarjetasConImagenYCompartir(
  props: Omit<ComponentProps<typeof TarjetasDeLaFicha>, 'Imagen' | 'compartir' | 'dialogos'>,
) {
  const abrirCompartir = useAbrirCompartirDeLaFila()
  return <TarjetasDeLaFicha {...props} Imagen={ImagenDeLaTarjeta} compartir={abrirCompartir} />
}

// Las cotizaciones de este vehículo en la ficha: la fila de tarjetas (al acercarse, con su código por `diferido()`), con las casillas de «Comparar» y «Aprobar esta» de `aprobada`.
// Tras aprobar o deshacer refresca la página: «Cotización aprobada» de la izquierda se lee en el servidor y no escucha a las islas. En la ficha no hay nada tipeado que perder,
// y la isla no se vuelve a montar.
export function CotizacionesDeEsteVehiculo({ vehiculo, aprobarEn, volverA }: Props) {
  const router = useRouter()
  const [, empezar] = useTransition()
  return (
    <TarjetasDelVehiculo
      vehiculo={vehiculo}
      aprobarEn={aprobarEn}
      volverA={volverA}
      ranuraDeComparar={ID_DE_LA_RANURA_DE_COMPARAR}
      Tarjetas={TarjetasConImagenYCompartir}
      alCambiar={() => {
        empezar(() => {
          router.refresh()
        })
      }}
    />
  )
}
