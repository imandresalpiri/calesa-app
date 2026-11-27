'use client'

import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { Modal } from '@/shared/ui/modal'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { DatosDelDocumento } from './datos-del-documento'
import { PieDeLaVistaPrevia } from './pie-de-la-vista-previa'
import { CAJA_DE_LA_VISTA_PREVIA, VisorDelArchivo } from './visor-del-archivo'

export const DOCUMENTO_YA_NO_ESTA = 'Este documento ya no está.'

type Props = {
  // La vista previa se abre con `?documento=<id>`: `id` es lo que dice la URL (nulo = cerrada).
  id: string | null
  // Los documentos vivos de la lista ya cargada, en el orden en que se ven: las flechas recorren éstos.
  documentos: readonly DocumentoDeLaUnidad[]
  tipos: readonly TipoDeDocumento[]
  nombres: Readonly<Record<string, string>>
  hoy: string
  contexto: ContextoDeLaFila
  // Abierta desde «Rechazar» del «⋯»: el campo del motivo ya está a mano y enfocado.
  rechazarAlAbrir: boolean
  pasarA: (documentoId: string) => void
  cerrar: () => void
  alTerminarDeCerrar: () => void
}

function esDeTexto(destino: EventTarget | null): boolean {
  return (
    destino instanceof HTMLElement &&
    (destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName))
  )
}

// Las flechas ← y → pasan al documento anterior o al siguiente, salvo mientras se escribe (el motivo).
function useFlechasDelTeclado(
  activo: boolean,
  alAnterior: (() => void) | null,
  alSiguiente: (() => void) | null,
) {
  useEffect(() => {
    if (!activo) return
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.altKey || evento.ctrlKey || evento.metaKey || esDeTexto(evento.target)) return
      if (evento.key === 'ArrowLeft' && alAnterior) {
        evento.preventDefault()
        alAnterior()
      } else if (evento.key === 'ArrowRight' && alSiguiente) {
        evento.preventDefault()
        alSiguiente()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      window.removeEventListener('keydown', alTeclear)
    }
  }, [activo, alAnterior, alSiguiente])
}

function Flecha({
  sentido,
  alPasar,
}: {
  sentido: 'anterior' | 'siguiente'
  alPasar: (() => void) | null
}) {
  const Icono = sentido === 'anterior' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-[44px] shrink-0 md:size-9"
      aria-label={sentido === 'anterior' ? 'Documento anterior' : 'Documento siguiente'}
      disabled={alPasar === null}
      onClick={() => {
        alPasar?.()
      }}
    >
      <Icono />
    </Button>
  )
}

// Dónde está el documento en la lista y a quién llevan las flechas. Si lo eliminó otra persona mientras se miraba, se recuerda dónde estaba: las flechas siguen con los demás desde ese lugar.
function useVecinos(documentos: readonly DocumentoDeLaUnidad[], idActual: string | null) {
  const indice = documentos.findIndex((d) => d.id === idActual)
  const [recordada, setRecordada] = useState<number | null>(null)
  if (indice >= 0 && indice !== recordada) setRecordada(indice)
  const lugar = indice >= 0 ? indice : recordada
  return {
    indice,
    documento: documentos[indice] ?? null,
    anterior: lugar === null ? undefined : documentos[lugar - 1],
    siguiente: lugar === null ? undefined : documentos[indice >= 0 ? lugar + 1 : lugar],
  }
}

function BarraDeLaVista({
  nombre,
  posicion,
  alAnterior,
  alSiguiente,
}: {
  nombre: string
  // «2 de 7»; nulo si el documento ya no está.
  posicion: string | null
  alAnterior: (() => void) | null
  alSiguiente: (() => void) | null
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-2">
      <Flecha sentido="anterior" alPasar={alAnterior} />
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
        <span className="min-w-0 truncate font-medium" title={nombre}>
          {nombre}
        </span>
        {posicion ? (
          <span className="shrink-0 text-(length:--text-sm) text-(--color-ink-soft)">
            {posicion}
          </span>
        ) : null}
      </div>
      <Flecha sentido="siguiente" alPasar={alSiguiente} />
    </div>
  )
}

// El archivo en una caja de alto fijo: lo mismo para una imagen, un PDF o un aviso.
function CajaDelArchivo({ documento }: { documento: DocumentoDeLaUnidad | null }) {
  return (
    <div className={CAJA_DE_LA_VISTA_PREVIA}>
      {documento ? (
        <VisorDelArchivo key={documento.id} documento={documento} />
      ) : (
        <div className="flex size-full items-center justify-center p-4 text-center text-(--color-ink-soft)">
          <p role="status">{DOCUMENTO_YA_NO_ESTA}</p>
        </div>
      )}
    </div>
  )
}

const alDeLaVista = (id: string | undefined, pasarA: (id: string) => void) =>
  id === undefined ? null : () => pasarA(id)

function Contenido({
  abierto,
  idActual,
  documentos,
  tipos,
  nombres,
  hoy,
  contexto,
  rechazarAlAbrir,
  pasarA,
  cerrar,
  alTerminarDeCerrar,
}: Omit<Props, 'id'> & { abierto: boolean; idActual: string | null }) {
  const { indice, documento, anterior, siguiente } = useVecinos(documentos, idActual)
  const alAnterior = alDeLaVista(anterior?.id, pasarA)
  const alSiguiente = alDeLaVista(siguiente?.id, pasarA)
  useFlechasDelTeclado(abierto, alAnterior, alSiguiente)
  const tipo = documento ? (tipos.find((t) => t.id === documento.tipoId) ?? null) : null

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Vista previa"
      ancho="grande"
      completoEnCelular
      focoAlCerrar={focoDeQuienAbrio}
      focoInicial={rechazarAlAbrir ? enfocarElMotivo : undefined}
      alTerminarDeCerrar={alTerminarDeCerrar}
      pie={
        documento ? (
          <PieDeLaVistaPrevia
            key={documento.id}
            documento={documento}
            tipo={tipo}
            contexto={contexto}
            rechazarAlAbrir={rechazarAlAbrir}
          />
        ) : null
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-vista-previa-del-documento>
        <BarraDeLaVista
          nombre={documento ? (documento.nombre ?? 'Documento sin nombre') : 'Documento'}
          posicion={documento ? `${String(indice + 1)} de ${String(documentos.length)}` : null}
          alAnterior={alAnterior}
          alSiguiente={alSiguiente}
        />
        <CajaDelArchivo documento={documento} />
        {documento ? (
          <DatosDelDocumento documento={documento} nombres={nombres} hoy={hoy} />
        ) : (
          <div className="min-h-[5.5rem]" />
        )}
      </div>
    </Modal>
  )
}

const enfocarElMotivo = () =>
  document.querySelector<HTMLElement>('[data-campo="motivo-del-rechazo"] input') ?? true

// La vista previa de un documento (`?documento=<id>`): el archivo en un modal de tamaño fijo, con flechas para pasar al anterior o al siguiente de la lista, y en el pie lo que se decide mirándolo (aprobar,
// rechazar con su motivo, «Visible en el portal»). Cada apertura empieza de cero (`useApertura`) y, al irse, conserva el último documento que mostró.
export function VistaPreviaDelDocumento({ id, ...resto }: Props) {
  const abierto = id !== null
  const apertura = useApertura(abierto)
  const idActual = useUltimo(id)
  return <Contenido key={apertura} abierto={abierto} idActual={idActual} {...resto} />
}
