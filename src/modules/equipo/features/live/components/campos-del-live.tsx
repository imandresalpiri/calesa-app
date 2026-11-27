'use client'

import { cn } from 'cn'
import { Badge } from '@/shared/ui/badge'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { CAMPOS_DEL_LIVE, type CampoDelLive, type OrigenesDelLive } from '../../../entities/live'
import type { OrigenDelLive } from '../../../entities/live-configuracion'
import {
  HEREDADO,
  casillasDeOrigenes,
  type FormularioDelLive,
} from '../../../entities/live-formulario'
import {
  ETIQUETAS_DEL_LIVE,
  SIEMPRE_OCULTOS_EN_EL_LIVE,
  opcionesDelCampo,
} from '../../../entities/live-textos'
import { CasillasDeOrigenes } from './casillas-de-origenes'

type Props = {
  // El prefijo del `id` de cada campo (el modal enfoca el primero).
  id: string
  eleccion: FormularioDelLive
  origenes: readonly OrigenDelLive[]
  // En el modal de una persona: la primera opción de cada campo («Como su rol (…)») y los orígenes que valen sin pisarlos.
  heredado: { etiqueta: (campo: CampoDelLive) => string; origenes: OrigenesDelLive } | null
  errores: Readonly<Record<string, string>>
  deshabilitado: boolean
  alElegir: (campo: CampoDelLive, opcion: string) => void
  alMarcarOrigen: (id: string, marcado: boolean) => void
}

const QUE_SE_VE = CAMPOS_DEL_LIVE.filter((campo) => campo !== 'puedeEncender')

export const idDelCampoDelLive = (id: string, campo: CampoDelLive) => `${id}-${campo}`

function Campo({ campo, ...props }: Props & { campo: CampoDelLive }) {
  const { heredado, eleccion } = props
  const opciones = [
    ...(heredado ? [{ valor: HEREDADO, etiqueta: heredado.etiqueta(campo) }] : []),
    ...opcionesDelCampo(campo),
  ]
  const propio = heredado !== null && eleccion.valores[campo] !== HEREDADO
  return (
    <CampoSeleccion
      nombre={idDelCampoDelLive(props.id, campo)}
      etiqueta={ETIQUETAS_DEL_LIVE[campo]}
      opciones={opciones}
      value={eleccion.valores[campo]}
      disabled={props.deshabilitado}
      error={props.errores[campo]}
      onChange={(evento) => {
        props.alElegir(campo, evento.target.value)
      }}
      // Siempre en su lugar (invisible sin lo propio): elegir no mueve nada.
      insignia={
        heredado === null ? undefined : (
          <Badge variant="secondary" aria-hidden={!propio} className={cn(!propio && 'invisible')}>
            Ajuste propio
          </Badge>
        )
      }
    />
  )
}

// Los campos de los dos modales de Configuración › Modo Live, en un solo nivel: «Puede encender el Modo Live» y, bajo «Qué se ve», cada área con su
// opción (las casillas de «Orígenes» siempre a la vista). Al pie, lo que nunca se ve.
export function CamposDelLive(props: Props) {
  return (
    <div className="grid gap-4">
      <Campo campo="puedeEncender" {...props} />
      <h3 className="text-(length:--text-base) font-semibold text-(--color-ink)">Qué se ve</h3>
      {QUE_SE_VE.map((campo) =>
        campo === 'origenes' ? (
          <div key={campo} className="grid gap-2">
            <Campo campo={campo} {...props} />
            <CasillasDeOrigenes
              origenes={props.origenes}
              casillas={casillasDeOrigenes(props.eleccion, props.heredado?.origenes ?? 'todos')}
              deshabilitado={props.deshabilitado}
              alMarcar={props.alMarcarOrigen}
            />
          </div>
        ) : (
          <Campo key={campo} campo={campo} {...props} />
        ),
      )}
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {SIEMPRE_OCULTOS_EN_EL_LIVE}
      </p>
    </div>
  )
}
