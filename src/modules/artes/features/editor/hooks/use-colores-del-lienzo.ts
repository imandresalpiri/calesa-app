'use client'

import { useState } from 'react'

export type ColoresDelLienzo = { acento: string; guia: string; superficie: string }

// Konva pinta en un canvas, que no lee variables de CSS: los colores de la interfaz del lienzo salen de los tokens al montarlo.
const TOKENS: Readonly<Record<keyof ColoresDelLienzo, [string, string]>> = {
  acento: ['--color-primario', '#3b5bdb'],
  guia: ['--color-peligro', '#d93838'],
  superficie: ['--color-surface', '#ffffff'],
}

function leer(): ColoresDelLienzo {
  const estilo = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement)
  const de = ([variable, respaldo]: [string, string]) =>
    estilo?.getPropertyValue(variable).trim() || respaldo
  return { acento: de(TOKENS.acento), guia: de(TOKENS.guia), superficie: de(TOKENS.superficie) }
}

export function useColoresDelLienzo(): ColoresDelLienzo {
  const [colores] = useState(leer)
  return colores
}
