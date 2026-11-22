'use client'

import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'

type Props = {
  // El nombre del nivel: «Más acciones de Gerencia».
  nombre: string
  acciones: readonly AccionDeMenu[]
  id: string
}

// El «⋯» de un nivel en la matriz de Roles: se pide al dibujarse la matriz (`MasAccionesDeNivelDiferido`), no con ella.
export function MasAccionesDeNivel({ nombre, acciones, id }: Props) {
  return <MasAcciones nombre={nombre} acciones={acciones} id={id} />
}
