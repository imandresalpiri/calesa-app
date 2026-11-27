'use client'

import Image from 'next/image'
import type { ParteDeCompartir } from '../../hooks/use-parte-de-compartir'
import type { VistaSinMoneda } from '../../hooks/use-para-compartir-la-cotizacion'
import { PROPORCION_DE_LA_IMAGEN } from '../imagen/imagen-de-la-tarjeta'
import { RecuadroDeLaImagen } from '../imagen/recuadro-de-la-imagen'

type Props = {
  // La que se comparte o, con el Modo Live, la vista sin moneda (`sinMoneda`).
  imagen: ParteDeCompartir<VistaSinMoneda>
  sinMoneda: boolean
  numero: number
  alReintentar: () => void
}

// «Imagen › Cotización»: la imagen de la tarjeta tal como sale (la que se copia, descarga o comparte), en el marco de su proporción. Mientras se arma, el recuadro de
// la imagen con «Preparando la imagen…»; si falla, «No se pudo armar la imagen.» con «Reintentar» (el texto y el PDF siguen). Con el Modo Live se muestra la variante
// sin moneda (lo que se copia, descarga o comparte sigue siendo la completa); `data-imagen-moneda` deja que el CSS de `globals.css` nunca muestre una con moneda en Live.
export function TarjetaParaCompartir({ imagen, sinMoneda, numero, alReintentar }: Props) {
  return (
    <div
      className="relative grid w-full overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
      style={{ aspectRatio: String(PROPORCION_DE_LA_IMAGEN) }}
    >
      {imagen.estado === 'listo' ? (
        <Image
          data-compartir-tarjeta=""
          data-imagen-moneda={sinMoneda ? 'sin' : 'con'}
          src={imagen.dato.url}
          alt={`Imagen de la tarjeta de la cotización n.º ${String(numero)}`}
          fill
          // Una imagen armada ahora (blob:): el optimizador no la toca.
          unoptimized
          sizes="(min-width: 56rem) 54rem, 100vw"
          className="object-contain"
        />
      ) : (
        <RecuadroDeLaImagen
          total={null}
          fallo={imagen.estado === 'error'}
          alReintentar={alReintentar}
        />
      )}
    </div>
  )
}
