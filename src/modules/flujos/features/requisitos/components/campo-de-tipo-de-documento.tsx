'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'

type Props = {
  // Los tipos activos; nulo mientras se leen.
  tipos: readonly TipoParaRequisito[] | null
  valor: string
  error: string | undefined
  alElegir: (tipoId: string) => void
  // «Crear tipo de documento»: abre el modal del editor del flujo; lo creado vuelve elegido.
  alCrear: () => void
  apagado: boolean
}

const SUFIJO_DEL_FLUJO = ' · de este flujo'
const BOTON = 'h-11 md:h-8'

function CrearTipo({ alCrear, apagado }: Pick<Props, 'alCrear' | 'apagado'>) {
  return (
    <Button type="button" variant="outline" className={BOTON} disabled={apagado} onClick={alCrear}>
      <PlusIcon aria-hidden />
      Crear tipo de documento
    </Button>
  )
}

// El selector del tipo de documento de un requisito. Con tipos compartidos y del flujo a la vez (los que el flujo tapa no llegan), los del flujo lo dicen.
// «Crear tipo de documento» va junto al selector y en el vacío: abre el modal sin salir de la fase (por defecto, «Sólo de <origen>»).
export function CampoDeTipoDeDocumento({ tipos, valor, error, alElegir, alCrear, apagado }: Props) {
  if (tipos !== null && tipos.length === 0) {
    return (
      <div className="grid justify-items-start gap-2">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No hay tipos de documento activos.
        </p>
        <CrearTipo alCrear={alCrear} apagado={apagado} />
      </div>
    )
  }
  const lista = tipos ?? []
  const mezclados = lista.some((t) => t.delFlujo) && lista.some((t) => !t.delFlujo)
  return (
    <div className="grid min-w-0 gap-2">
      <CampoSeleccion
        nombre="tipo_documento_id"
        etiqueta="Tipo de documento"
        autoFocus
        disabled={tipos === null}
        value={valor}
        opciones={[
          { valor: '', etiqueta: tipos === null ? 'Leyendo tipos…' : 'Elige un tipo' },
          ...lista.map((t) => ({
            valor: t.id,
            etiqueta: mezclados && t.delFlujo ? `${t.nombre}${SUFIJO_DEL_FLUJO}` : t.nombre,
          })),
        ]}
        onChange={(evento) => {
          alElegir(evento.target.value)
        }}
        error={error}
      />
      <div className="flex">
        <CrearTipo alCrear={alCrear} apagado={apagado || tipos === null} />
      </div>
    </div>
  )
}
