'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD } from '../../../areas/documentos/composicion.client'
import type { ClavesDeDocumentos } from '../../../entities/documentos/revision'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { agruparPorTipo, type GrupoDeTipo } from '../../../entities/documentos/agrupar'
import type { Unidad } from '../../../entities/nucleo/unidad'
import {
  useDocumentosDeLaUnidad,
  type DatoDeDocumentos,
  type LecturaDeDocumentos,
} from '../hooks/use-documentos-de-la-unidad'
import {
  useEditarDocumentoPorUrl,
  useEliminarDocumentoPorUrl,
  type DocumentoPorUrl,
} from '../hooks/use-documento-por-url'
import { useMiniaturas } from '../hooks/use-miniaturas'
import { useVistaPreviaPorUrl } from '../hooks/use-vista-previa-por-url'
import { useEliminarElDocumento } from '../hooks/use-eliminar-el-documento'
import { useClavesDeDocumentos } from '../hooks/use-claves-de-documentos'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { ConfirmarEliminarDocumento } from './confirmar-eliminar-documento'
import { ModalDeEdicionDelDocumentoDiferido, VistaPreviaDelDocumentoDiferida } from './diferidos'
import { GrupoDeTipoDeDocumento } from './grupo-de-tipo'
import { SubidaDeLaUnidad } from './subida-de-la-unidad'

function ErrorDeLectura({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <div className="grid gap-2">
      <Aviso tono="peligro">
        <p>{mensaje}</p>
      </Aviso>
      <div>
        <Button variant="outline" className="min-h-11 md:min-h-9" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function EstadoDeLaLectura({
  lectura,
  reintentar,
}: {
  lectura: LecturaDeDocumentos
  reintentar: () => void
}) {
  if (lectura.tipo === 'cargando') return <Cargando />
  if (lectura.tipo === 'error') {
    return <ErrorDeLectura mensaje={lectura.error.mensaje} reintentar={reintentar} />
  }
  return null
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando los documentos" className="grid gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

function ListaDeGrupos({
  dato,
  grupos,
  contexto,
}: {
  dato: DatoDeDocumentos
  grupos: GrupoDeTipo[]
  contexto: ContextoDeLaFila
}) {
  return (
    <>
      {grupos.map((grupo) => (
        <GrupoDeTipoDeDocumento
          key={grupo.tipo?.id ?? 'otro-tipo'}
          grupo={grupo}
          contexto={contexto}
          hoy={dato.hoy}
        />
      ))}
      {dato.hayMas && grupos.length > 0 ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD, { sustantivo: 'documentos' })}
        />
      ) : null}
    </>
  )
}

type Dialogos = {
  dato: DatoDeDocumentos
  enOrden: DocumentoDeLaUnidad[]
  contexto: ContextoDeLaFila
  unidadId: string
  vista: ReturnType<typeof useVistaPreviaPorUrl>
  rechazando: boolean
  alRechazar: (rechazando: boolean) => void
  editando: DocumentoPorUrl
  eliminando: DocumentoPorUrl
}

// Lo que se abre encima de la lista: la vista previa (`?documento=`), el modal de editar y la confirmación de eliminar. La vista previa y la edición se montan al primer toque.
function DialogosDeLosDocumentos({
  dato,
  enOrden,
  contexto,
  unidadId,
  vista,
  rechazando,
  alRechazar,
  editando,
  eliminando,
}: Dialogos) {
  const eliminar = useEliminarElDocumento(unidadId)
  const montarLaVista = useAbiertoAlgunaVez(vista.id !== null)
  const montarLaEdicion = useAbiertoAlgunaVez(editando.abierto)
  return (
    <>
      {montarLaVista ? (
        <VistaPreviaDelDocumentoDiferida
          id={vista.id}
          documentos={enOrden}
          tipos={dato.tipos}
          nombres={dato.nombres}
          hoy={dato.hoy}
          contexto={contexto}
          rechazarAlAbrir={rechazando}
          pasarA={(id) => {
            alRechazar(false)
            vista.pasarA(id)
          }}
          cerrar={vista.cerrar}
          alTerminarDeCerrar={() => {
            alRechazar(false)
          }}
        />
      ) : null}
      {montarLaEdicion ? (
        <ModalDeEdicionDelDocumentoDiferido
          documento={editando.documento}
          tipo={dato.tipos.find((t) => t.id === editando.documento?.tipoId) ?? null}
          contexto={contexto}
          abierto={editando.abierto}
          alCerrar={editando.cerrar}
        />
      ) : null}
      <ConfirmarEliminarDocumento
        documento={eliminando.documento}
        abierto={eliminando.abierto}
        eliminar={eliminar}
        alCerrar={eliminando.cerrar}
      />
    </>
  )
}

type PropsDelContenido = {
  unidad: Unidad
  dato: DatoDeDocumentos
  claves: ClavesDeDocumentos
  releer: () => void
}

// La lista ya leída con lo que se abre encima. Cada fila es una miniatura con su «⋯» y tocarla abre la vista previa (`?documento=`), donde se aprueba o rechaza mirando el archivo.
function ContenidoDelHueco({ unidad, dato, claves, releer }: PropsDelContenido) {
  const grupos = agruparPorTipo(dato.documentos, dato.tipos, dato.requisitos, dato.hoy)
  // Los documentos en el orden en que se ven: por ellos pasan las flechas de la vista previa.
  const enOrden = grupos.flatMap((g) => g.documentos)
  const miniaturas = useMiniaturas(enOrden)
  const vista = useVistaPreviaPorUrl()
  const [rechazando, setRechazando] = useState(false)
  const eliminando = useEliminarDocumentoPorUrl(dato.documentos, claves)
  const editando = useEditarDocumentoPorUrl(dato.documentos, claves)
  const contexto: ContextoDeLaFila = {
    unidadId: unidad.id,
    claves,
    tipos: dato.tipos,
    releer,
    miniaturas,
    alVer: (id) => {
      setRechazando(false)
      vista.abrir(id)
    },
    alRechazar: (id) => {
      setRechazando(true)
      vista.abrir(id)
    },
    alEditar: editando.abrir,
    alEliminar: eliminando.abrir,
  }
  return (
    <>
      <SubidaDeLaUnidad unidad={unidad} dato={dato} />
      {grupos.length === 0 ? (
        <EstadoVacio compacto titulo="Esta unidad no tiene documentos." />
      ) : null}
      <ListaDeGrupos dato={dato} grupos={grupos} contexto={contexto} />
      <DialogosDeLosDocumentos
        dato={dato}
        enOrden={enOrden}
        contexto={contexto}
        unidadId={unidad.id}
        vista={vista}
        rechazando={rechazando}
        alRechazar={setRechazando}
        editando={editando}
        eliminando={eliminando}
      />
    </>
  )
}

// El hueco «Documentos» del panel de la unidad y el bloque «Documentos» de la ficha del vehículo: un solo componente (D2). Lee y muestra (6.06-1), sube con una bandeja (6.06-2) y revisa (6.06-3). Se
// dibuja con `logistica.ver` del origen; la base decide lo demás.
export function HuecoDeDocumentos({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar, releer } = useDocumentosDeLaUnidad(unidad)
  const claves = useClavesDeDocumentos(unidad)
  return (
    <div className="grid gap-3" data-hueco="documentos">
      <EstadoDeLaLectura lectura={lectura} reintentar={reintentar} />
      {lectura.tipo === 'listo' ? (
        <ContenidoDelHueco unidad={unidad} dato={lectura.dato} claves={claves} releer={releer} />
      ) : null}
    </div>
  )
}
