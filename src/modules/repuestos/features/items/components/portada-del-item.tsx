'use client'

import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { urlPublica } from '@/shared/lib/almacen'
import { useImagenesDelPanel } from './imagenes-del-item-proveedor'

// La foto chica de «Qué es»: la primera imagen del ítem, en una caja de tamaño fijo (la misma con la foto, sin ella o mientras llega: nada se mueve). Es de adorno: lo que se ve
// y se cambia está en la tarjeta «Imágenes». Sin lectura del panel (o si falló), el marcador.
export function PortadaDelItem({ descripcion }: { descripcion: string }) {
  const imagenes = useImagenesDelPanel()
  const primera = imagenes?.lectura.estado === 'leido' ? (imagenes.imagenes[0] ?? null) : null
  return (
    <div
      aria-hidden
      className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) text-(--color-ink-faint)"
    >
      {primera === null ? (
        <ImageIcon className="size-5" />
      ) : (
        <Image
          src={urlPublica('repuestos', primera.ruta)}
          alt={`Primera imagen de «${descripcion}»`}
          fill
          unoptimized
          sizes="56px"
          className="object-cover"
        />
      )}
    </div>
  )
}
