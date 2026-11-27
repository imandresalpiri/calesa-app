'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import {
  motivoDeRechazoValido,
  quePuedeHacer,
  type Accion,
  type QuePuedeHacer,
} from '../../../entities/documentos/revision'
import { useRevisarElDocumento } from '../hooks/use-revisar-el-documento'
import { CampoDelMotivo } from './campo-del-motivo'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
  // El pie de la vista previa (de alto fijo): el motivo del rechazo se escribe en la misma línea de los botones.
  enLinea?: boolean
  // Arranca con el campo del motivo abierto y enfocado (rechazar desde el «⋯»): sólo si se puede rechazar.
  rechazarAlAbrir?: boolean
}

const sePuede = (accion: Accion, enCurso: boolean) => accion.tipo === 'habilitada' && !enCurso

// El texto que explica por qué un botón está apagado (uno solo: aprobar y rechazar piden lo mismo).
function motivoApagado(acciones: readonly Accion[]): string | null {
  for (const accion of acciones) {
    if (accion.tipo === 'apagada' && accion.motivo !== null) return accion.motivo
  }
  return null
}

function AvisosDeLaRevision({
  conflicto,
  error,
  releer,
}: {
  conflicto: string | null
  error: string | null
  releer: () => void
}) {
  return (
    <>
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={releer}
          detalle="No se cambió nada. Recargar trae la versión nueva y conserva tu motivo."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
    </>
  )
}

// El campo del motivo arranca abierto sólo si se pidió rechazar y se puede.
const motivoInicial = (rechazarAlAbrir: boolean, puede: QuePuedeHacer): string | null =>
  rechazarAlAbrir && puede.rechazar.tipo === 'habilitada' ? '' : null

const hayBotones = (puede: QuePuedeHacer): boolean =>
  puede.aprobar.tipo !== 'oculta' || puede.rechazar.tipo !== 'oculta'

type PropsDeLosBotones = {
  puede: QuePuedeHacer
  enCurso: boolean
  describe: string | undefined
  // Escribiendo el motivo: «Rechazar» ya no está; en línea, tampoco «Aprobar».
  escribiendo: boolean
  enLinea: boolean
  aprobar: () => void
  pedirMotivo: () => void
}

function BotonesDeRevisar({
  puede,
  enCurso,
  describe,
  escribiendo,
  enLinea,
  aprobar,
  pedirMotivo,
}: PropsDeLosBotones) {
  return (
    <div className={enLinea && escribiendo ? 'hidden' : 'flex flex-wrap gap-2'}>
      {puede.aprobar.tipo !== 'oculta' ? (
        <Button
          className="min-h-11 md:min-h-9"
          disabled={!sePuede(puede.aprobar, enCurso)}
          aria-describedby={describe}
          onClick={aprobar}
        >
          Aprobar
        </Button>
      ) : null}
      {puede.rechazar.tipo !== 'oculta' && !escribiendo ? (
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={!sePuede(puede.rechazar, enCurso)}
          aria-describedby={describe}
          onClick={pedirMotivo}
        >
          Rechazar
        </Button>
      ) : null}
    </div>
  )
}

// «Aprobar» y «Rechazar» en la fila de un documento (6.06-3). Sin la clave de aprobar quedan apagados y dicen por qué; no se esconden. Rechazar pide el motivo en un campo junto al
// botón. Si otra persona cambió la fila (`PT409`) se dice aquí, con el motivo todavía escrito.
export function AccionesDelDocumento({
  documento,
  tipo,
  contexto,
  enLinea = false,
  rechazarAlAbrir = false,
}: Props) {
  const puede = quePuedeHacer(documento, tipo, contexto.claves)
  const { revisar, enCurso, error, conflicto } = useRevisarElDocumento(contexto.unidadId, documento)
  const [motivo, setMotivo] = useState<string | null>(motivoInicial(rechazarAlAbrir, puede))
  const idMotivo = `revisar-${documento.id}-motivo`
  const porQue = motivoApagado([puede.aprobar, puede.rechazar])
  const describe = porQue ? idMotivo : undefined
  if (!hayBotones(puede) && !error && !conflicto) return null

  function confirmarRechazo() {
    const valido = motivoDeRechazoValido(motivo ?? '')
    if (valido === null) return
    void revisar('rechazado', valido).then((quedo) => {
      if (quedo) setMotivo(null)
    })
  }

  return (
    <div className="grid gap-2" data-acciones-de-revision>
      <BotonesDeRevisar
        puede={puede}
        enCurso={enCurso}
        describe={describe}
        escribiendo={motivo !== null}
        enLinea={enLinea}
        aprobar={() => void revisar('aprobado', null)}
        pedirMotivo={() => {
          setMotivo('')
        }}
      />
      {porQue ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {porQue}
        </p>
      ) : null}
      {motivo !== null && puede.rechazar.tipo === 'habilitada' ? (
        <CampoDelMotivo
          documentoId={documento.id}
          motivo={motivo}
          alEscribir={setMotivo}
          alCancelar={() => {
            setMotivo(null)
          }}
          alConfirmar={confirmarRechazo}
          enCurso={enCurso}
          enLinea={enLinea}
          enfocar
        />
      ) : null}
      <AvisosDeLaRevision conflicto={conflicto} error={error} releer={contexto.releer} />
    </div>
  )
}
