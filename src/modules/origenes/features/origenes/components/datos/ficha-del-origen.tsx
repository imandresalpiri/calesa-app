import { MOTIVO_TIPO_NO_CAMBIA } from '../../../../entities/motivos'
import { ETIQUETA_DE_TIPO_DE_ORIGEN, type OrigenConUso } from '../../../../entities/origen'

// Lo que no se edita: el tipo y la clave interna salen de cuando se creó el origen.
export function FichaDelOrigen({ origen }: { origen: OrigenConUso }) {
  return (
    <dl className="grid gap-1 text-(length:--text-sm)">
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Tipo</dt>
        <dd className="font-medium text-(--color-ink)">
          {ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}
        </dd>
      </div>
      <div className="flex min-w-0 flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Clave interna</dt>
        <dd className="min-w-0 font-mono break-all text-(--color-ink)">{origen.clave}</dd>
      </div>
      <p className="text-(--color-ink-faint)">{MOTIVO_TIPO_NO_CAMBIA}</p>
    </dl>
  )
}
