'use client'

import { useId, type ComponentProps } from 'react'
import { Button } from '@/shared/ui/button'
import { useDescargaDelPdfDelArte } from '../../hooks/use-descarga-del-pdf-del-arte'
import { ANCHOS_DE_LA_BARRA } from '../rejilla'

const SIN_RED = 'No hay conexión.'

type Props = Parameters<typeof useDescargaDelPdfDelArte>[0]

// «Descargar PDF» de la barra del editor en una plantilla de PDF (también en sólo lectura), antes del «⋯». De ancho fijo: mientras el servidor lo
// arma dice «Armando el PDF…» sin cambiar de tamaño, apagado; sin conexión, apagado con el motivo (en `title` y para el lector de pantalla).
export function BotonDescargarPdf(props: Props) {
  const { bajando, enLinea, descargar } = useDescargaDelPdfDelArte(props)
  const idDelMotivo = useId()
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`h-8 shrink-0 ${ANCHOS_DE_LA_BARRA.pdf}`}
        disabled={bajando || !enLinea}
        aria-busy={bajando}
        aria-describedby={enLinea ? undefined : idDelMotivo}
        title={enLinea ? undefined : SIN_RED}
        onClick={() => {
          void descargar()
        }}
      >
        {bajando ? 'Armando el PDF…' : 'Descargar PDF'}
      </Button>
      {enLinea ? null : (
        <span id={idDelMotivo} className="sr-only">
          {SIN_RED}
        </span>
      )}
    </>
  )
}

export type PdfDeLaBarra = Pick<ComponentProps<typeof BotonDescargarPdf>, 'lienzo' | 'editor'>
