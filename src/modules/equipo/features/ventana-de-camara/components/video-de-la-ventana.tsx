'use client'

import { useEffect, useRef } from 'react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { mensajeDeLaCamara, type EstadoDeLaCamara } from '../abrir-la-camara'

type Props = {
  estado: EstadoDeLaCamara
  stream: MediaStream | null
  espejo: boolean
  alReintentar: () => void
}

// El video de la ventana, siempre 16:9: sin permiso, sin cámara o con un error, el aviso (con «Reintentar») ocupa el mismo lugar y mide lo mismo que el video,
// así nada salta cuando la cámara llega o falla. Sin audio: `muted`. El espejo es sólo de lo que se ve (la imagen nunca se guarda).
export function VideoDeLaVentana({ estado, stream, espejo, alReintentar }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const elemento = video.current
    if (elemento && elemento.srcObject !== stream) {
      elemento.srcObject = stream
    }
  }, [stream])

  const mensaje = mensajeDeLaCamara(estado)
  return (
    <div
      data-camara={estado}
      className="relative aspect-video w-full shrink-0 overflow-hidden bg-(--color-paper-dim)"
    >
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        aria-label="Tu cámara"
        className={cn(
          'absolute inset-0 size-full object-cover',
          espejo && '-scale-x-100',
          estado !== 'lista' && 'invisible',
        )}
      />
      {mensaje ? (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto p-3 text-center"
        >
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{mensaje}</p>
          <Button type="button" size="sm" variant="outline" onClick={alReintentar}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  )
}
