'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { urlDelDocumento } from '../../../areas/documentos/composicion.client'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { formaDelArchivo } from '../../../entities/documentos/vista-previa'
import { ImagenConZoom } from './imagen-con-zoom'
import { abrirDocumento } from './ver-documento'

export const NO_HAY_VISTA_PREVIA = 'No hay vista previa de este tipo de archivo.'
export const NO_SE_PUDO_MOSTRAR = 'No pudimos mostrar este archivo.'
export const SIN_VISOR_DE_PDF = 'Este navegador no muestra el PDF aquí.'
export const SIN_ARCHIVO = 'Este documento aún no tiene archivo.'

/** La caja del archivo en una vista previa: el mismo alto para una imagen, un PDF o un aviso. */
export const CAJA_DE_LA_VISTA_PREVIA =
  'h-[48dvh] overflow-hidden rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) sm:h-[min(48dvh,28rem)]'

const CAJA = 'flex size-full flex-col items-center justify-center gap-3 p-4 text-center'

export function Mensaje({ texto, children }: { texto: string; children?: ReactNode }) {
  return (
    <div className={CAJA} data-mensaje-de-la-vista-previa>
      <p className="text-(--color-ink-soft)">{texto}</p>
      {children ? <div className="flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  )
}

function BotonesDelArchivo({
  documento,
  conPestana = false,
  reintentar,
}: {
  documento: DocumentoDeLaUnidad
  conPestana?: boolean
  reintentar?: () => void
}) {
  const ruta = documento.ruta
  const nombre = documento.nombre ?? 'documento'
  if (ruta === null) return null
  return (
    <>
      {reintentar ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={reintentar}
        >
          Reintentar
        </Button>
      ) : null}
      {conPestana ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={() => void abrirDocumento(ruta, nombre, 'ver')}
        >
          Abrir en otra pestaña
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={() => void abrirDocumento(ruta, nombre, 'descargar')}
      >
        Descargar
      </Button>
    </>
  )
}

// ¿El navegador muestra un PDF dentro de una página? Casi ningún celular lo hace; sin saberlo (`undefined`), se prueba.
export function muestraPdf(): boolean {
  return typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false
}

function DelArchivo({
  documento,
  url,
  alFallar,
}: {
  documento: DocumentoDeLaUnidad
  url: string
  alFallar: () => void
}) {
  const forma = formaDelArchivo(documento)
  const nombre = documento.nombre ?? 'Documento sin nombre'
  if (forma === 'imagen') return <ImagenConZoom url={url} alt={nombre} alFallar={alFallar} />
  if (!muestraPdf()) {
    return (
      <Mensaje texto={SIN_VISOR_DE_PDF}>
        <BotonesDelArchivo documento={documento} conPestana />
      </Mensaje>
    )
  }
  return <iframe src={url} title={nombre} className="size-full border-0" data-visor-de-pdf />
}

// Lo que se ve del archivo de un documento, en la caja que le da la vista previa (el mismo tamaño para una imagen, un PDF o un aviso): la imagen con zoom, el PDF en el visor del navegador o,
// si no se puede, lo que pasa y cómo seguir. La URL firmada se pide al mostrarse (una por documento); si venció o falla, se pide otra sola, una vez, y luego se dice con «Reintentar».
export function VisorDelArchivo({ documento }: { documento: DocumentoDeLaUnidad }) {
  const ruta = documento.ruta
  const forma = formaDelArchivo(documento)
  const { lectura, reintentar } = useLecturaAlMontar(
    () =>
      ruta === null || forma === 'otro'
        ? Promise.resolve({ ok: true as const, data: '' })
        : urlDelDocumento(ruta, { descargar: null, paraLaVistaPrevia: true }),
    `${documento.id}:${ruta ?? ''}`,
  )
  const [fallo, setFallo] = useState(false)
  const renovada = useRef(false)

  if (ruta === null) return <Mensaje texto={SIN_ARCHIVO} />
  if (forma === 'otro') {
    return (
      <Mensaje texto={NO_HAY_VISTA_PREVIA}>
        <BotonesDelArchivo documento={documento} />
      </Mensaje>
    )
  }
  if (lectura.estado === 'leyendo') {
    return (
      <div className={CAJA} aria-busy="true" aria-label="Cargando el archivo">
        <Skeleton className="size-full" />
      </div>
    )
  }
  if (lectura.estado === 'fallo' || fallo) {
    return (
      <Mensaje texto={NO_SE_PUDO_MOSTRAR}>
        <BotonesDelArchivo
          documento={documento}
          reintentar={() => {
            renovada.current = false
            setFallo(false)
            reintentar()
          }}
        />
      </Mensaje>
    )
  }
  return (
    <DelArchivo
      documento={documento}
      url={lectura.dato}
      alFallar={() => {
        // La URL pudo vencer: se pide otra, una sola vez; si la imagen sigue sin cargar, se dice.
        if (renovada.current) {
          setFallo(true)
          return
        }
        renovada.current = true
        reintentar()
      }}
    />
  )
}
