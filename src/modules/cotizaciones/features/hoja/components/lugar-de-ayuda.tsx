'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja } from '../../../entities/hoja'
import type { AyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import { AyudaEnBloquesDiferida } from './diferidos'

type Props = { secciones: readonly SeccionDeHoja[]; contexto: ContextoDeHoja; ayuda: AyudaDeLaHoja }

// El panel de ayuda de un conjunto de secciones (la hoja, o el modal «Avanzado»): su código se pide la primera vez que la URL nombra una celda.
export function LugarDeAyuda({ secciones, contexto, ayuda }: Props) {
  const montar = useAbiertoAlgunaVez(ayuda.nodo !== null)
  return montar ? (
    <AyudaEnBloquesDiferida secciones={secciones} contexto={contexto} ayuda={ayuda} />
  ) : null
}
