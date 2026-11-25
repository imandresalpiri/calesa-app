'use client'

import type { ReactNode } from 'react'
import { ContextoDeLaEdicionDeLaTabla } from '../../../hoja/components/ayuda/hueco-de-la-edicion'
import { EdicionDeLaTablaEnLaAyudaDiferida } from './diferidos'

// Enciende la edición de las tablas desde la ayuda de la hoja (el hueco `EdicionDeLaTabla`): `src/app` lo pone sobre la hoja nueva sólo para quien configura el origen
// (`cotizaciones.configurar`). Sin él, la tabla de la ayuda sólo se consulta. Lo que edita viaja recién al montarse un bloque de tabla.
export function ProveedorDeLaEdicionDeLaTabla({ children }: { children: ReactNode }) {
  return (
    <ContextoDeLaEdicionDeLaTabla value={EdicionDeLaTablaEnLaAyudaDiferida}>
      {children}
    </ContextoDeLaEdicionDeLaTabla>
  )
}
