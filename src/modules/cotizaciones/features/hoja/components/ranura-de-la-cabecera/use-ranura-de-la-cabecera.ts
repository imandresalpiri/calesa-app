'use client'

import { use } from 'react'
import { ContextoDeLaRanuraDeLaCabecera } from './contexto'

// Dónde va la cabecera de la hoja: `undefined` sin el proveedor (el lienzo del editor, la hoja de prueba, las pruebas: en su lugar, arriba de las secciones); nulo
// mientras la ranura no se montó (no se dibuja: la ranura guarda su alto); el elemento cuando está.
export function useRanuraDeLaCabecera(): HTMLElement | null | undefined {
  const ranura = use(ContextoDeLaRanuraDeLaCabecera)
  return ranura === null ? undefined : ranura.elemento
}
