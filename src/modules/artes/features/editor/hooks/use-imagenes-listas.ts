'use client'

import { useCallback } from 'react'
import { esCapaConImagen, type CapaConImagen, type PaginaDeArte } from '../../../entities/documento'
import { ESPERA_DE_LAS_IMAGENES_MS } from '../../../entities/editor/exportar'
import { fuenteDeLaCapa } from '../../../entities/editor/fuente-de-la-capa'
import { estaOculta } from '../../../entities/editor/grupos'
import type { LogoDelEditor } from '../../../entities/tipos'
import { cargarImagen, estaLista } from './use-imagen-del-lienzo'

function plazo(ms: number): { promesa: Promise<void>; cortar: () => void } {
  let id: ReturnType<typeof setTimeout> | undefined
  const promesa = new Promise<void>((resolver) => {
    id = setTimeout(resolver, ms)
  })
  return {
    promesa,
    cortar: () => {
      clearTimeout(id)
    },
  }
}

// Espera las imágenes que dibuja la página (las visibles), hasta `ESPERA_DE_LAS_IMAGENES_MS`, y devuelve cuántas no cargaron: lo que se
// exporta sale sin ellas y quien exporta lo avisa (`textoDeImagenesQueFaltan()`).
export function useImagenesListas(
  pagina: PaginaDeArte,
  logos: readonly LogoDelEditor[],
): () => Promise<number> {
  return useCallback(async () => {
    const conImagen = pagina.capas.filter(
      (c): c is CapaConImagen => esCapaConImagen(c) && !estaOculta(pagina, c),
    )
    const porSrc = new Map(
      conImagen.map((c) => {
        const fuente = fuenteDeLaCapa(c, logos)
        return [fuente.src, () => cargarImagen(fuente, { ancho: c.ancho, alto: c.alto })] as const
      }),
    )
    const espera = plazo(ESPERA_DE_LAS_IMAGENES_MS)
    try {
      await Promise.race([
        Promise.allSettled([...porSrc.values()].map((cargar) => cargar())),
        espera.promesa,
      ])
    } finally {
      espera.cortar()
    }
    return [...porSrc.keys()].filter((src) => !estaLista(src)).length
  }, [pagina, logos])
}
