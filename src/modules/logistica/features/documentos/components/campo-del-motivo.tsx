'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Input } from '@/shared/ui/input'
import {
  FALTA_EL_MOTIVO,
  MOTIVO_MAXIMO,
  motivoDeRechazoValido,
} from '../../../entities/documentos/revision'

type Props = {
  documentoId: string
  motivo: string
  alEscribir: (motivo: string) => void
  alConfirmar: () => void
  alCancelar: () => void
  enCurso: boolean
  // En una sola línea (el pie de la vista previa, de alto fijo): el campo y los dos botones juntos, sin etiqueta visible (su nombre es «Motivo del rechazo»).
  enLinea?: boolean
  // Lleva el foco al campo al dibujarse (rechazar desde el «⋯» abre la vista previa con el motivo a mano).
  enfocar?: boolean
}

function BotonesDelMotivo({
  valido,
  enCurso,
  idAyuda,
  alConfirmar,
  alCancelar,
}: {
  valido: boolean
  enCurso: boolean
  idAyuda: string
  alConfirmar: () => void
  alCancelar: () => void
}) {
  return (
    <>
      <Button
        variant="destructive"
        className="min-h-11 md:min-h-9"
        disabled={!valido || enCurso}
        aria-describedby={!valido ? idAyuda : undefined}
        onClick={alConfirmar}
      >
        Confirmar rechazo
      </Button>
      <Button
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={enCurso}
        onClick={alCancelar}
      >
        Cancelar
      </Button>
    </>
  )
}

// El motivo de un rechazo, escrito junto al botón (D22): de 1 a 500 caracteres. Vacío, «Confirmar rechazo» está apagado y dice por qué.
export function CampoDelMotivo({
  documentoId,
  motivo,
  alEscribir,
  alConfirmar,
  alCancelar,
  enCurso,
  enLinea = false,
  enfocar = false,
}: Props) {
  const valido = motivoDeRechazoValido(motivo) !== null
  const idAyuda = `motivo-${documentoId}-falta`
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (enfocar) campo.current?.focus()
  }, [enfocar])
  const botones = (
    <BotonesDelMotivo
      valido={valido}
      enCurso={enCurso}
      idAyuda={idAyuda}
      alConfirmar={alConfirmar}
      alCancelar={alCancelar}
    />
  )
  const ayuda = !valido ? (
    <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-soft)">
      {FALTA_EL_MOTIVO}
    </p>
  ) : null
  if (enLinea) {
    return (
      <div className="grid gap-1" data-campo="motivo-del-rechazo">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={campo}
            name={`motivo-${documentoId}`}
            aria-label="Motivo del rechazo"
            placeholder="Motivo del rechazo"
            autoComplete="off"
            maxLength={MOTIVO_MAXIMO}
            value={motivo}
            onChange={(evento) => {
              alEscribir(evento.target.value)
            }}
            disabled={enCurso}
            className="h-11 min-w-0 flex-1 basis-48 md:h-9"
          />
          {botones}
        </div>
        {ayuda}
      </div>
    )
  }
  return (
    <div className="grid gap-2" data-campo="motivo-del-rechazo">
      <Campo
        nombre={`motivo-${documentoId}`}
        etiqueta="Motivo del rechazo"
        autoComplete="off"
        maxLength={MOTIVO_MAXIMO}
        value={motivo}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        disabled={enCurso}
      />
      {ayuda}
      <div className="flex flex-wrap gap-2">{botones}</div>
    </div>
  )
}
