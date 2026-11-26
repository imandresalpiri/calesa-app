'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'

export const VISTAS_DEL_FLUJO = ['diagrama', 'lista'] as const
export type VistaDelFlujo = (typeof VISTAS_DEL_FLUJO)[number]

const VISTA = parseAsStringLiteral(VISTAS_DEL_FLUJO)
  // El servidor no depende de la vista: cambiarla no lo llama ni suma al historial (`docs/DECISIONES.md` › «Flujos»).
  .withOptions({ shallow: true, history: 'replace' })

// Cómo se ven las fases (`?vista=diagrama|lista`): la elegida o, sin elegir, desde 768 px el diagrama y más angosto la lista. «Ver como diagrama» y «Ver como
// lista» alternan en todo ancho: en el celular el diagrama se ve y se toca (no se arrastra ni se vincula, `angosto`).
export function useVistaDelFlujo() {
  const [elegida, setElegida] = useQueryState('vista', VISTA)
  const ancho = useAlMenos(CORTE_DE_LA_TABLA)
  const vista: VistaDelFlujo = elegida ?? (ancho ? 'diagrama' : 'lista')
  return {
    vista,
    angosto: !ancho,
    alternar: () => {
      void setElegida(vista === 'diagrama' ? 'lista' : 'diagrama')
    },
  }
}
