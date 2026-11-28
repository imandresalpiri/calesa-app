'use client'

import { useCallback, useState } from 'react'
import type { CodigoError } from '@/shared/lib/errores'
import { avisar } from '@/shared/ui/toasts'
import { pedirElPdf } from '../../../areas/tarjeta/composicion-pdf.client'
import { rutaDelPdf } from '../../../entities/ruta-de-la-hoja'
import { archivoDelPdf } from '../../../entities/tarjeta/archivo-del-pdf'
import { textoDeLasImagenesQueFaltan } from '../../../entities/tarjeta/fallo-del-pdf'

export type EstadoDeLaDescarga =
  { tipo: 'quieta' } | { tipo: 'bajando' } | { tipo: 'fallo'; codigo: CodigoError }

// Lo que tarda el navegador en tomar el archivo antes de soltar su URL.
export const ESPERA_PARA_SOLTAR_MS = 1000

// Baja unos bytes como archivo sin salir de la página: un `<a download>` de un momento sobre una URL del blob, que después se suelta.
function bajarComoArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, ESPERA_PARA_SOLTAR_MS)
}

// «Descargar PDF» de «Vista previa» (4.18-3b, C5): pide el PDF de lo guardado y lo baja como `cotizacion-<n>.pdf`. Mientras pide, `bajando`; si falla, `fallo` con su código
// (quien dibuja pone el texto) y se puede volver a pedir. Con la plantilla de arte por defecto, el PDF es el del arte: si salió sin alguna imagen, lo avisa.
export function useDescargaDelPdf(
  cotizacionId: string,
  numero: number | null,
): { estado: EstadoDeLaDescarga; descargar: () => void } {
  const [estado, setEstado] = useState<EstadoDeLaDescarga>({ tipo: 'quieta' })
  const descargar = useCallback(() => {
    setEstado({ tipo: 'bajando' })
    void pedirElPdf(rutaDelPdf(cotizacionId)).then((resultado) => {
      if (!resultado.ok) {
        setEstado({ tipo: 'fallo', codigo: resultado.error.codigo })
        return
      }
      bajarComoArchivo(
        resultado.data.blob,
        (numero === null ? null : archivoDelPdf(numero)) ?? 'cotizacion.pdf',
      )
      setEstado({ tipo: 'quieta' })
      const aviso = textoDeLasImagenesQueFaltan(resultado.data.faltan)
      if (aviso !== null) {
        avisar(aviso)
      }
    })
  }, [cotizacionId, numero])
  return { estado, descargar }
}
