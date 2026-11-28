'use client'

import { useCallback } from 'react'
import { esCapaConImagen, type CapaConImagen, type PaginaDeArte } from '../../../entities/documento'
import { ESPERA_DE_LAS_IMAGENES_MS } from '../../../entities/editor/exportar'
import type { CapasConDatos } from '../../../entities/datos/capas-con-datos'
import type { FuenteDeImagen } from '../../../entities/editor/fuente-de-la-capa'
import { estaOculta } from '../../../entities/editor/grupos'
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

function fuenteResuelta(conDatos: CapasConDatos, capa: CapaConImagen): FuenteDeImagen | null {
  const resuelta = conDatos.resueltas.get(capa.id)
  return resuelta?.tipo === 'imagen' && !conDatos.escondidas.has(capa.id) ? resuelta.fuente : null
}

// Espera las imágenes que dibuja la página (las visibles, con los datos de ahora), hasta `ESPERA_DE_LAS_IMAGENES_MS`, y devuelve cuántas no
// cargaron: lo que se exporta sale sin ellas y quien exporta lo avisa (`textoDeImagenesQueFaltan()`). Las que se esconden por falta de su dato
// no cuentan.
export function useImagenesListas(
  pagina: PaginaDeArte,
  conDatos: CapasConDatos,
): () => Promise<number> {
  return useCallback(async () => {
    const conImagen = pagina.capas.filter(
      (c): c is CapaConImagen => esCapaConImagen(c) && !estaOculta(pagina, c),
    )
    const porSrc = new Map<string, () => Promise<HTMLImageElement>>()
    for (const c of conImagen) {
      const fuente = fuenteResuelta(conDatos, c)
      if (fuente) {
        porSrc.set(fuente.src, () => cargarImagen(fuente, { ancho: c.ancho, alto: c.alto }))
      }
    }
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
  }, [pagina, conDatos])
}
