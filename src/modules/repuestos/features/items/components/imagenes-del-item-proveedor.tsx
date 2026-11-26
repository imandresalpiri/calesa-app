'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useImagenesDeItem } from '../hooks/use-imagenes-de-item'

type Imagenes = ReturnType<typeof useImagenesDeItem>

const ContextoDeLasImagenes = createContext<Imagenes | null>(null)

/** Las imágenes que lee el panel del ítem (una sola lectura para la portada y la tarjeta «Imágenes»); nulo fuera del panel. */
export function useImagenesDelPanel(): Imagenes | null {
  return useContext(ContextoDeLasImagenes)
}

// Lee las imágenes del ítem una vez, al montarse el panel (`limit 9`, nunca con la hoja), y las comparte con quien las dibuja: la portada de «Qué es» y la tarjeta «Imágenes».
export function ImagenesDelItemProveedor({
  itemId,
  children,
}: {
  itemId: string
  children: ReactNode
}) {
  const imagenes = useImagenesDeItem(itemId)
  return <ContextoDeLasImagenes value={imagenes}>{children}</ContextoDeLasImagenes>
}
