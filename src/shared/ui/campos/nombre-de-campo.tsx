import { ETIQUETA_DE_TIPO_DE_CAMPO, type CampoBase } from '@/shared/lib/campos'
import { Badge } from '@/shared/ui/badge'

type Props = {
  campo: CampoBase
  // Lo que la fila dice además de «Requerido» y «De fábrica», en su orden (lo del módulo, «Dato clave», las banderas encendidas).
  insignias: readonly string[]
}

// El nombre de un campo en su fila: la etiqueta, su tipo y clave, y lo que dice con texto. Al 200 % las insignias se parten en renglones.
export function NombreDeCampo({ campo, insignias }: Props) {
  return (
    <div className="grid min-w-0 flex-1 gap-1">
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 font-medium break-words text-(--color-ink)">{campo.etiqueta}</span>
        <span className="text-(length:--text-sm) text-(--color-ink-faint)">
          {ETIQUETA_DE_TIPO_DE_CAMPO[campo.tipo]} · <span className="font-mono">{campo.clave}</span>
        </span>
      </span>
      {campo.requerido || campo.esSistema || insignias.length > 0 ? (
        <span className="flex min-w-0 flex-wrap gap-1">
          {campo.requerido ? <Badge variant="secondary">Requerido</Badge> : null}
          {campo.esSistema ? <Badge variant="outline">De fábrica</Badge> : null}
          {insignias.map((insignia) => (
            <Badge key={insignia} variant="outline">
              {insignia}
            </Badge>
          ))}
        </span>
      ) : null}
    </div>
  )
}
