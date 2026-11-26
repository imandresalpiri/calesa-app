'use client'

import type { CampoBase } from '@/shared/lib/campos'
import { Bloque } from '@/shared/ui/bloque'
import type { PropsDelCuerpo } from './cuerpo'
import { FilaDeCampo } from './fila-de-campo'

type Props = Pick<PropsDelCuerpo, 'insignias' | 'puedeGestionar' | 'alElegir'> & {
  campos: readonly CampoBase[]
}

// Los campos que se sacaron del formulario, a la vista y sin conteo. Sus datos siguen guardados: «Activar» del «⋯» los devuelve.
export function CamposDesactivados({ campos, insignias, puedeGestionar, alElegir }: Props) {
  return (
    <Bloque titulo="Desactivados">
      <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {campos.map((campo) => (
          <FilaDeCampo
            key={campo.id}
            campo={campo}
            insignias={insignias.get(campo.id) ?? []}
            puedeGestionar={puedeGestionar}
            puedeSubir={false}
            puedeBajar={false}
            casilla={null}
            conAsa={false}
            alElegir={alElegir}
          />
        ))}
      </ul>
    </Bloque>
  )
}
