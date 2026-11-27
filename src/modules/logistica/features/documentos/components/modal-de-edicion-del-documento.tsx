'use client'

import { useState } from 'react'
import { Campo } from '@/shared/ui/campo'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { camposDeFechasDelTipo, TOPE_DE_LA_NOTA } from '../../../entities/documentos/admision'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { cambiosDeLaEdicion } from '../../../entities/documentos/revision'
import { useEditarElDocumento } from '../hooks/use-editar-el-documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Valores = { emitidoEl: string; venceEl: string; nota: string }

const valoresDe = (d: DocumentoDeLaUnidad): Valores => ({
  emitidoEl: d.emitidoEl ?? '',
  venceEl: d.venceEl ?? '',
  nota: d.nota ?? '',
})

function CamposDeFechas({
  prefijo,
  tipo,
  valores,
  escribir,
  porCampo,
  enCurso,
}: {
  prefijo: string
  tipo: TipoDeDocumento | null
  valores: Valores
  escribir: (parte: Partial<Valores>) => void
  porCampo: Record<string, string>
  enCurso: boolean
}) {
  const fechas = camposDeFechasDelTipo(tipo)
  if (!fechas.emitido && fechas.vence === 'oculto') return null
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fechas.emitido ? (
        <Campo
          nombre={`${prefijo}-emitido`}
          etiqueta="Emitido el"
          type="date"
          value={valores.emitidoEl}
          onChange={(e) => {
            escribir({ emitidoEl: e.target.value })
          }}
          error={porCampo['emitidoEl']}
          disabled={enCurso}
        />
      ) : null}
      {fechas.vence !== 'oculto' ? (
        <Campo
          nombre={`${prefijo}-vence`}
          etiqueta={fechas.vence === 'obligatorio' ? 'Vence el' : 'Vence el (opcional)'}
          type="date"
          value={valores.venceEl}
          onChange={(e) => {
            escribir({ venceEl: e.target.value })
          }}
          error={porCampo['venceEl']}
          disabled={enCurso}
        />
      ) : null}
    </div>
  )
}

type PropsDeLosCampos = {
  prefijo: string
  tipo: TipoDeDocumento | null
  valores: Valores
  escribir: (parte: Partial<Valores>) => void
  porCampo: Record<string, string>
  enCurso: boolean
}

// Las fechas y la nota: van dentro del `<form>` de `ModalDeFormulario`, que dice arriba el conflicto, el rechazo y la falta de conexión.
function CamposDeLaEdicion({
  prefijo,
  tipo,
  valores,
  escribir,
  porCampo,
  enCurso,
}: PropsDeLosCampos) {
  return (
    <>
      <CamposDeFechas
        prefijo={prefijo}
        tipo={tipo}
        valores={valores}
        escribir={escribir}
        porCampo={porCampo}
        enCurso={enCurso}
      />
      <Campo
        nombre={`${prefijo}-nota`}
        etiqueta="Nota (opcional)"
        autoComplete="off"
        maxLength={TOPE_DE_LA_NOTA}
        value={valores.nota}
        onChange={(e) => {
          escribir({ nota: e.target.value })
        }}
        error={porCampo['nota']}
        disabled={enCurso}
      />
    </>
  )
}

type PropsDelModal = {
  // El que se edita; el último que se vio mientras el modal se va.
  documento: DocumentoDeLaUnidad | null
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
  abierto: boolean
  alCerrar: () => void
}

function Edicion({
  documento,
  tipo,
  contexto,
  abierto,
  alCerrar,
}: Omit<PropsDelModal, 'documento'> & { documento: DocumentoDeLaUnidad }) {
  const { editar, enCurso, error, porCampo, conflicto } = useEditarElDocumento(
    contexto.unidadId,
    documento,
  )
  const enLinea = useEnLinea()
  const [valores, setValores] = useState<Valores>(() => valoresDe(documento))
  const cambios = cambiosDeLaEdicion(valoresDe(documento), valores)
  const prefijo = `editar-${documento.id}`

  async function guardar(): Promise<boolean> {
    if (cambios === null) return false
    const quedo = await editar(cambios, 'Documento actualizado.')
    if (quedo) alCerrar()
    return quedo
  }

  return (
    <ModalDeFormulario
      id={prefijo}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Editar «${documento.nombre ?? 'Documento sin nombre'}»`}
      focoAlCerrar={focoDeQuienAbrio}
      detalleDelConflicto="No se guardó nada. Recargar trae la versión nueva y conserva lo que escribiste."
      formulario={{
        enCurso,
        hayCambios: cambios !== null,
        conflicto,
        aviso: error,
        enLinea,
        esperandoConexion: false,
        enviar: guardar,
        sinPoderEnviar: cambios === null,
        reintentar: () => undefined,
        recargar: contexto.releer,
      }}
    >
      <CamposDeLaEdicion
        prefijo={prefijo}
        tipo={tipo}
        valores={valores}
        escribir={(parte) => {
          setValores({ ...valores, ...parte })
        }}
        porCampo={porCampo}
        enCurso={enCurso}
      />
    </ModalDeFormulario>
  )
}

// «Editar» las fechas y la nota de un documento (D24), en un modal con su URL (`?panel=editar-documento&documento=<id>`). «Guardar» manda sólo lo que cambió y está apagado si nada cambió. Si la base rechaza un
// campo, lo dice junto a él. Un `PT409` se dice aquí y conserva lo escrito. Cada apertura empieza con lo guardado (`useApertura`); al irse conserva el último documento.
export function ModalDeEdicionDelDocumento({ documento, abierto, ...resto }: PropsDelModal) {
  const apertura = useApertura(abierto)
  const ultimo = useUltimo(abierto ? documento : null)
  if (ultimo === null) return null
  return <Edicion key={apertura} documento={ultimo} abierto={abierto} {...resto} />
}
