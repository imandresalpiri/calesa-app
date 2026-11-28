'use client'

import Image from 'next/image'
import { useState } from 'react'

// La vista previa de un logo, una foto de ejemplo o la tarjeta en «Agregar»: una caja de alto fijo sobre damero (se ve la transparencia de un
// logo) con la imagen entera adentro. Son rutas del mismo origen que ya vienen a su tamaño: `unoptimized`. Si no carga, la caja queda vacía.
export function VistaPrevia({ src }: { src: string }) {
  const [fallo, setFallo] = useState<string | null>(null)
  return (
    <span className="relative block h-20 overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-dim) bg-[conic-gradient(var(--color-line)_25%,transparent_0_50%,var(--color-line)_0_75%,transparent_0)] bg-size-[12px_12px]">
      {fallo === src ? null : (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          loading="lazy"
          sizes="8rem"
          className="object-contain p-1.5"
          onError={() => {
            setFallo(src)
          }}
        />
      )}
    </span>
  )
}
