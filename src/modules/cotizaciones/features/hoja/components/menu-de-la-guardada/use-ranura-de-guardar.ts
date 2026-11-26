'use client'

import { useContext } from 'react'
import { ContextoDelMenuEstable, ContextoDelMenuVivo } from './contexto'

// Dónde va «Guardar» en una guardada: en la cabecera, junto a «Compartir». `undefined` sin el proveedor (la hoja nueva: en el cierre de la hoja, debajo de «Avanzado»); nulo mientras la cabecera
// no montó su ranura (no se dibuja: un cuadro reservado, sin saltos); el elemento cuando está.
export function useRanuraDeGuardar(): HTMLElement | null | undefined {
  const menu = useContext(ContextoDelMenuEstable)
  const { ranura } = useContext(ContextoDelMenuVivo)
  return menu === null ? undefined : ranura
}
