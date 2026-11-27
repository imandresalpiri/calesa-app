'use client'

import { useEffect, useRef } from 'react'
import { useVisorDeGaleria } from '@/shared/ui/visor-de-imagenes'

type Props = {
  clave: string
  // Con su moneda o sin ella (el Modo Live): otra variante es otra imagen del visor.
  variante: 'con' | 'sin'
  titulo: string
  url: string
  // Cada clic en la imagen suma uno: el visor se abre al montarse y con cada pedido nuevo. Cero: lo abrió la URL (`?visor=`).
  pedidos: number
}

// El visor de fotos de siempre con la imagen de la tarjeta a tamaño completo (una sola imagen). Llega por `diferido()` al primer clic o con la URL que ya lo nombra.
export function VisorDeLaImagen({ clave, variante, titulo, url, pedidos }: Props) {
  const galeria = useVisorDeGaleria(clave, titulo, [
    { id: `${clave}:${variante}`, miniatura: url, grande: url },
  ])
  // `abrir` es otra función en cada dibujo: el efecto la toma del ref y corre sólo con un pedido nuevo.
  const abrirRef = useRef(galeria.abrir)
  useEffect(() => {
    abrirRef.current = galeria.abrir
  })
  useEffect(() => {
    if (pedidos > 0) {
      abrirRef.current(0)
    }
  }, [pedidos])
  return galeria.visor
}
