'use client'

import { MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ESCALA_MAXIMA, useZoomDeLaImagen } from '../hooks/use-zoom-de-la-imagen'

type Props = {
  url: string
  alt: string
  // La imagen no cargó (la URL venció o el archivo no es una imagen): lo dice quien la pone.
  alFallar: () => void
}

const BOTON = 'size-[44px] bg-(--color-surface)/90 md:size-9'

function BotonDeZoom({
  nombre,
  apagado,
  alPulsar,
  children,
}: {
  nombre: string
  apagado: boolean
  alPulsar: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={BOTON}
      aria-label={nombre}
      disabled={apagado}
      onClick={alPulsar}
    >
      {children}
    </Button>
  )
}

// La imagen de un documento ajustada a su caja, con zoom (`useZoomDeLaImagen`): botones «Alejar», «Acercar» y «Ajustar a la caja» abajo a la derecha, rueda, doble toque y arrastrar.
export function ImagenConZoom({ url, alt, alFallar }: Props) {
  const { vista, caja, acercar, alejar, ajustar, manejadores } = useZoomDeLaImagen()
  return (
    <div
      ref={caja}
      className="relative size-full touch-none overflow-hidden"
      data-imagen-con-zoom
      data-escala={vista.escala}
      {...manejadores}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de un bucket privado: next/image no la puede optimizar. */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        onError={alFallar}
        className={`size-full object-contain select-none ${vista.escala > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
        style={{
          transform: `translate(${String(vista.x)}px, ${String(vista.y)}px) scale(${String(vista.escala)})`,
        }}
      />
      <div
        className="absolute right-2 bottom-2 flex gap-1"
        onDoubleClick={(evento) => {
          evento.stopPropagation()
        }}
      >
        <BotonDeZoom nombre="Alejar" apagado={vista.escala === 1} alPulsar={alejar}>
          <ZoomOutIcon />
        </BotonDeZoom>
        <BotonDeZoom nombre="Acercar" apagado={vista.escala === ESCALA_MAXIMA} alPulsar={acercar}>
          <ZoomInIcon />
        </BotonDeZoom>
        <BotonDeZoom nombre="Ajustar a la caja" apagado={vista.escala === 1} alPulsar={ajustar}>
          <MaximizeIcon />
        </BotonDeZoom>
      </div>
    </div>
  )
}
