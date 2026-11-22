'use client'

import { useEffect } from 'react'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { ListaDeNiveles } from '../../../entities/nivel'
import { menuDeNivel } from '../components/acciones-de-nivel'
import type { Niveles } from './use-niveles'

type Quehaceres = {
  alRenombrar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// Distingue los ids del «⋯» de cada nivel (`data-mas-acciones="nivel-<id>-mas"`): un modal que se abre desde el menú le devuelve el foco al que se ve.
export const PREFIJO_DE_NIVEL = 'nivel'

export const idDelMasDeNivel = (id: string) => `${PREFIJO_DE_NIVEL}-${id}-mas`

// Las líneas del «⋯» de cada nivel, por su clave: un nivel sin líneas (el fijo) no figura. Quien sólo lee (sin `equipo.roles.gestionar`) no tiene ninguna.
// Retirar y restaurar guardan solos: el foco vuelve al «⋯» del nivel que cambió.
export function useMenusDeNiveles(
  lista: ListaDeNiveles,
  niveles: Niveles,
  puedeGestionar: boolean,
  { alRenombrar, alPedirEliminar }: Quehaceres,
): Map<string, AccionDeMenu[]> {
  const cambio = niveles.cambio
  useEffect(() => {
    if (cambio) {
      document
        .querySelector<HTMLElement>(`[data-mas-acciones="${idDelMasDeNivel(cambio.id)}"]`)
        ?.focus()
    }
  }, [cambio])

  const menus = new Map<string, AccionDeMenu[]>()
  if (!puedeGestionar) {
    return menus
  }
  for (const nivel of lista.niveles) {
    const acciones = menuDeNivel(nivel, {
      alRenombrar,
      alRetirar: (uno) => void niveles.retirar(uno),
      alRestaurar: (uno) => void niveles.restaurar(uno),
      alPedirEliminar,
    })
    if (acciones.length > 0) {
      menus.set(nivel.clave, acciones)
    }
  }
  return menus
}
