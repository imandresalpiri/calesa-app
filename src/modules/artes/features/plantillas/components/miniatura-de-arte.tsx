'use client'

import { cn } from 'cn'
import Image from 'next/image'
import { useState, type ReactNode } from 'react'

type Props = {
  // La URL firmada (600 s) o nula si no tiene.
  url: string | null
  // La proporción del arte o de la imagen: el marcador la dibuja cuando no hay miniatura o no carga.
  ancho: number
  alto: number
  // Sobre damero (una imagen con transparencia de la biblioteca) o sobre el papel.
  damero?: boolean
  // El «⋯» y lo que va encima, en la esquina.
  children?: ReactNode
}

// La caja de la miniatura de una tarjeta de Artes: mide siempre lo mismo (alto fijo, todo el ancho), así nada salta cuando llega la imagen,
// cuando falla o entre una tarjeta horizontal y una vertical; adentro, la miniatura entera (`object-contain`). Sin URL, o si la firma venció y no
// carga, un marcador con la proporción del arte. `unoptimized`: es una URL firmada de un bucket privado y ya es la de 480 px.
export function MiniaturaDeArte({ url, ancho, alto, damero = false, children }: Props) {
  const [fallo, setFallo] = useState<string | null>(null)
  const conImagen = url !== null && fallo !== url
  return (
    <div
      className={cn(
        'relative flex h-40 w-full items-center justify-center overflow-hidden rounded-(--radius-md) border border-(--color-line)',
        damero
          ? 'bg-(--color-paper-dim) bg-[conic-gradient(var(--color-line)_25%,transparent_0_50%,var(--color-line)_0_75%,transparent_0)] bg-size-[16px_16px]'
          : 'bg-(--color-paper-dim)',
      )}
    >
      {conImagen ? (
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          loading="lazy"
          sizes="(min-width: 640px) 16rem, 100vw"
          className="object-contain p-2"
          onError={() => {
            setFallo(url)
          }}
        />
      ) : (
        // Un SVG con la proporción del arte: `meet` lo encaja entero en la caja, sea horizontal o vertical.
        <svg
          aria-hidden
          data-marcador-de-arte=""
          viewBox={`0 0 ${String(ancho)} ${String(alto)}`}
          className="size-full p-4"
        >
          <rect
            width={ancho}
            height={alto}
            className="fill-(--color-surface) stroke-(--color-line-strong)"
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {children}
    </div>
  )
}
