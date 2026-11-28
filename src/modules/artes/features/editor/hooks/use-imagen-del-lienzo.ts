'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FuenteDeImagen } from '../../../entities/editor/fuente-de-la-capa'
import type { Medidas } from '../../../entities/formatos'

export type EstadoDeLaImagen = 'cargando' | 'lista' | 'fallo'
export type ImagenDelLienzo = { imagen: HTMLImageElement | null; estado: EstadoDeLaImagen }

const CARGANDO: ImagenDelLienzo = { imagen: null, estado: 'cargando' }

// Una carga por `src` para todo el editor (las capas que muestran la misma imagen la comparten); la que falla sale del mapa y se reintenta
// la próxima vez que alguien la pide. Sin `crossOrigin`: todo lo que dibuja el lienzo es del mismo origen.
const cargas = new Map<string, Promise<HTMLImageElement>>()
const listas = new Map<string, HTMLImageElement>()

// Las que no cargaron la última vez que se pidieron (una foto o una tarjeta que falla se suma a lo que falta): se reemplaza entera en cada cambio
// para que `useSyncExternalStore` vea otra.
let fallidas: ReadonlySet<string> = new Set()
const oyentes = new Set<() => void>()

function anotar(src: string, fallo: boolean) {
  if (fallidas.has(src) === fallo) {
    return
  }
  const otras = new Set(fallidas)
  if (fallo) {
    otras.add(src)
  } else {
    otras.delete(src)
  }
  fallidas = otras
  for (const oyente of oyentes) {
    oyente()
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

const lasFallidas = () => fallidas

// Las `src` que no cargaron (cambia cuando una falla o vuelve a cargar).
export function useImagenesQueFallaron(): ReadonlySet<string> {
  return useSyncExternalStore(suscribir, lasFallidas, lasFallidas)
}

// Las medidas con que se dibuja: las del archivo; un SVG sin las suyas, las que le puso quien lo cargó.
export function medidasDeLaImagen(imagen: HTMLImageElement): Medidas {
  return {
    ancho: imagen.naturalWidth || imagen.width,
    alto: imagen.naturalHeight || imagen.height,
  }
}

// Carga la imagen (o devuelve la carga en curso). Con medidas (las de la fuente o, si no se saben, las de la capa), se las pone al elemento
// antes de dibujarlo: un SVG sin medidas propias no se dibuja en Firefox.
export function cargarImagen(
  fuente: FuenteDeImagen,
  respaldo?: Medidas,
): Promise<HTMLImageElement> {
  const enCurso = cargas.get(fuente.src)
  if (enCurso) {
    return enCurso
  }
  const medidas = fuente.medidas ?? respaldo
  const carga = new Promise<HTMLImageElement>((resolver, rechazar) => {
    const imagen = new Image()
    if (medidas && medidas.ancho > 0 && medidas.alto > 0) {
      imagen.width = Math.round(medidas.ancho)
      imagen.height = Math.round(medidas.alto)
    }
    imagen.onload = () => {
      listas.set(fuente.src, imagen)
      anotar(fuente.src, false)
      resolver(imagen)
    }
    imagen.onerror = () => {
      cargas.delete(fuente.src)
      anotar(fuente.src, true)
      rechazar(new Error(`No se pudo cargar ${fuente.src}`))
    }
    imagen.src = fuente.src
  })
  cargas.set(fuente.src, carga)
  return carga
}

// Si la imagen de `src` ya está para dibujar (al exportar, las que no, faltan).
export function estaLista(src: string): boolean {
  return listas.has(src)
}

type Leida = ImagenDelLienzo & { src: string }

function loQueSeVe(src: string | null, leida: Leida | null): ImagenDelLienzo {
  if (src === null) {
    return CARGANDO
  }
  const yaLista = listas.get(src)
  if (yaLista) {
    return { imagen: yaLista, estado: 'lista' }
  }
  return leida?.src === src ? leida : CARGANDO
}

// La imagen de una capa para el lienzo (y para el inspector, que avisa «No se pudo cargar la imagen.»). Una que ya cargó llega lista sin
// esperar. `respaldo`: el tamaño de la capa, para un SVG cuya fuente no trae medidas.
export function useImagenDelLienzo(
  fuente: FuenteDeImagen | null,
  respaldo?: Medidas,
): ImagenDelLienzo {
  const src = fuente?.src ?? null
  const { ancho = null, alto = null } = fuente?.medidas ?? {}
  const [leida, setLeida] = useState<Leida | null>(null)
  const ultimoRespaldo = useRef(respaldo)

  useEffect(() => {
    ultimoRespaldo.current = respaldo
  }, [respaldo])

  useEffect(() => {
    if (src === null || listas.has(src)) {
      return
    }
    let vigente = true
    const medidas = ancho !== null && alto !== null ? { ancho, alto } : null
    cargarImagen({ src, medidas }, ultimoRespaldo.current).then(
      (imagen) => {
        if (vigente) {
          setLeida({ src, imagen, estado: 'lista' })
        }
      },
      () => {
        if (vigente) {
          setLeida({ src, imagen: null, estado: 'fallo' })
        }
      },
    )
    return () => {
      vigente = false
    }
  }, [src, ancho, alto])

  return loQueSeVe(src, leida)
}
