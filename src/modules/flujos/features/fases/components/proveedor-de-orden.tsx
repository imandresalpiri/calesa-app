'use client'

import { useMemo, type ReactNode } from 'react'
import { motivoSinOrdenDeFases } from '../../../entities/fases/orden-de-fases'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { ContextoDeOrdenDeFases } from '../../configuracion/hooks/use-orden-de-fases'
import { useListaDeFases } from '../hooks/use-lista-de-fases'

type Props = { flujo: FlujoParaConfigurar; children: ReactNode }

// El hueco `ordenDeFases`: ordenar desde el panel («Mover antes/después») escribe por `fase_mover` con la versión del flujo,
// una escritura a la vez; un `PT409` va al aviso de arriba del flujo. Con la lista cortada por el tope, no se ordena (con su motivo).
export function ProveedorDeOrden({ flujo, children }: Props) {
  const lista = useListaDeFases(flujo)
  const motivo = motivoSinOrdenDeFases(flujo)
  const { mover, enCurso } = lista
  const valor = useMemo(() => ({ motivo, mover, enCurso }), [motivo, mover, enCurso])
  return <ContextoDeOrdenDeFases value={valor}>{children}</ContextoDeOrdenDeFases>
}
