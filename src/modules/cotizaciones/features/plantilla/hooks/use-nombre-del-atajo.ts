'use client'

import { useState } from 'react'
import { esMac, teclasDeLaCombinacion } from '@/shared/lib/atajos'

// Cómo se escribe un atajo en este equipo: «Ctrl+Z», o «⌘+Z» en macOS (`title` y menús de la barra). El editor sólo se dibuja en el navegador, así que leer la
// plataforma al montarse no desajusta la hidratación.
export function useNombreDelAtajo(): (combinacion: string) => string {
  const [mac] = useState(() => typeof navigator !== 'undefined' && esMac(navigator.platform))
  return (combinacion) => teclasDeLaCombinacion(combinacion, { mac }).join('+')
}
