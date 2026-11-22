import type { ResumenDeImpacto } from '@/shared/lib/campos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { AvisoDeImpacto } from './aviso-de-impacto'

type Props = {
  // El aviso de impacto de guardar o eliminar, si hay uno.
  impacto: { resumen: ResumenDeImpacto } | null
  // Otra persona guardó este campo (`PT409`).
  conflicto: string | null
  // Un rechazo al crear que no es de un dato (sin red, sin permiso).
  rechazo: string | null
  enCurso: boolean
  alRecargar: () => void
}

const DETALLE_DEL_CONFLICTO = 'Recargar trae la versión guardada y conserva lo que escribiste.'

// Lo que el panel de un campo dice justo arriba de sus botones, en vez de un toast: la persona decide con lo suyo a la vista.
export function AvisosDelFormulario({ impacto, conflicto, rechazo, enCurso, alRecargar }: Props) {
  return (
    <>
      {impacto ? <AvisoDeImpacto resumen={impacto.resumen} /> : null}
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          detalle={DETALLE_DEL_CONFLICTO}
          enCurso={enCurso}
          alRecargar={alRecargar}
        />
      ) : null}
      {rechazo ? <Aviso tono="peligro">{rechazo}</Aviso> : null}
    </>
  )
}
