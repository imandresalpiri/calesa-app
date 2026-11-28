'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PaginaDeArte } from '../../../entities/documento'
import { fuenteDe } from '../../../entities/editor/fuentes'

// next/font le pone a Geist un nombre con hash: el lienzo lo lee de la variable que arma el layout.
const VARIABLE_DE_GEIST = '--font-geist-sans'
const RESPALDO_DE_GEIST = 'ui-sans-serif, system-ui, sans-serif'
const SEPARADOR = '\n'

function familiaDeGeist(): string {
  if (typeof document === 'undefined') {
    return RESPALDO_DE_GEIST
  }
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(VARIABLE_DE_GEIST)
    .trim()
  return valor || RESPALDO_DE_GEIST
}

export type FuentesDelLienzo = {
  // La `font-family` de una fuente del documento (`fuenteDe()`; Geist, la resuelta).
  familiaDe: (clave: string) => string
  // Cambia cada vez que terminan de cargar las fuentes que usa la página: los textos se vuelven a medir y a dibujar.
  version: number
  // Espera esas fuentes (antes de exportar).
  esperar: () => Promise<void>
}

// Las fuentes de los textos del lienzo: Konva mide y dibuja con la fuente que haya en ese momento, así que se cargan con `document.fonts.load`
// y, al llegar, los textos se rehacen. Una que no carga se dibuja con su respaldo.
export function useFuentesListas(pagina: PaginaDeArte): FuentesDelLienzo {
  const [geist] = useState(familiaDeGeist)
  const [version, setVersion] = useState(0)
  const familiaDe = useCallback((clave: string) => fuenteDe(clave).familia ?? geist, [geist])

  // Cada familia con cada peso que usan los textos de la página, en una clave que no cambia mientras no cambien.
  const pedidas = useMemo(() => {
    const fuentes = pagina.capas.flatMap((c) =>
      c.tipo === 'texto' ? [`${String(c.peso)} 16px ${familiaDe(c.fuente)}`] : [],
    )
    return [...new Set(fuentes)].sort().join(SEPARADOR)
  }, [pagina.capas, familiaDe])

  const esperar = useCallback(async () => {
    if (typeof document === 'undefined') {
      return
    }
    const fuentes = pedidas.split(SEPARADOR).filter((f) => f !== '')
    await Promise.all(fuentes.map((f) => document.fonts.load(f).catch(() => [])))
    await document.fonts.ready
  }, [pedidas])

  useEffect(() => {
    let vigente = true
    void esperar().then(() => {
      if (vigente) {
        setVersion((v) => v + 1)
      }
    })
    return () => {
      vigente = false
    }
  }, [esperar])

  return useMemo(() => ({ familiaDe, version, esperar }), [familiaDe, version, esperar])
}
