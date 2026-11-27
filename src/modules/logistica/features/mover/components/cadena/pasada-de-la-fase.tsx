'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { NodoDeLaCadena } from '../../../../entities/mover/cadena'

const NADIE = 'Sistema'

function Momento({
  titulo,
  cuando,
  quien,
  nota,
}: {
  titulo: string
  cuando: string | null
  quien: string | null
  nota: string | null
}) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-sm) font-medium text-(--color-ink)">{titulo}</dt>
      <dd className="text-(length:--text-sm) text-(--color-ink-soft)">
        {cuando ? formatearFechaHora(cuando, { zona: zonaHoraria }) : 'No se sabe cuándo'}
        {' · '}
        {quien ?? NADIE}
      </dd>
      {nota ? (
        <dd className="text-(length:--text-sm) break-words whitespace-pre-line text-(--color-ink)">
          {nota}
        </dd>
      ) : null}
    </div>
  )
}

// «Qué falta» de una fase por la que la unidad ya pasó: cuándo entró y salió, quién la movió cada vez y con qué nota. Sin lectura: lo trae la cadena.
export function PasadaDeLaFase({ nodo }: { nodo: NodoDeLaCadena }) {
  return (
    <dl className="grid gap-3" data-hueco="que-falta" data-estado="pasada">
      <Momento titulo="Entró" cuando={nodo.entro} quien={nodo.quienEntro} nota={nodo.notaEntro} />
      <Momento titulo="Salió" cuando={nodo.salio} quien={nodo.quienSalio} nota={nodo.notaSalio} />
    </dl>
  )
}
