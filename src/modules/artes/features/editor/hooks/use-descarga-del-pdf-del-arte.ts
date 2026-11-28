'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { descargarArchivo } from '@/shared/lib/compartir'
import { avisar, avisarError } from '@/shared/ui/toasts'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { pedirElPdfDelArte } from '../../../composicion.client'
import { eleccionDelEjemplo, type EjemploConDatos } from '../../../entities/datos/ejemplo-con-datos'
import {
  MENSAJE_PDF_EN_BLANCO,
  nombreDelPdf,
  textoDeImagenesQueFaltanEnElPdf,
} from '../../../entities/editor/exportar'
import type { PlantillaDelEditor } from '../../../entities/tipos'
import type { EditorDeArte, ManejoDelLienzo } from '../tipos'
import { unCuadro } from './un-cuadro'

type Args = {
  plantilla: Pick<PlantillaDelEditor, 'id'>
  nombre: string
  lienzo: RefObject<ManejoDelLienzo | null>
  // Lo que se ve al pedirlo (también sin guardar) y lo elegido como ejemplo (sin nada elegido, los datos de ejemplo).
  editor: Pick<EditorDeArte, 'estado'>
  ejemplo: { elegido: EjemploConDatos | null }
}

// «Descargar PDF» del editor de artes en una plantilla de PDF: lo arma el servidor con lo que se ve y los datos del vehículo de ejemplo (`POST
// /artes/<id>/pdf`) y se baja como archivo sin salir del editor. Un pedido a la vez; sin conexión no se pide (el botón lo dice). Un texto abierto
// entra antes al documento. Avisa si la plantilla no tiene elementos o si el PDF salió sin alguna imagen.
export function useDescargaDelPdfDelArte(args: Args) {
  const enLinea = useEnLinea()
  const [bajando, setBajando] = useState(false)
  const enCurso = useRef(false)
  const ultimo = useRef(args)
  useEffect(() => {
    ultimo.current = args
  })

  const descargar = async () => {
    if (enCurso.current || !enLinea) {
      return
    }
    enCurso.current = true
    setBajando(true)
    try {
      if (ultimo.current.lienzo.current?.terminarElTexto() === true) {
        await unCuadro()
      }
      const { plantilla, editor, ejemplo, nombre } = ultimo.current
      const visto = editor.estado.documento
      const eleccion = eleccionDelEjemplo(ejemplo.elegido)
      const hecho = await pedirElPdfDelArte(plantilla.id, { documento: visto, eleccion })
      if (!hecho.ok) {
        avisarError(hecho.error)
        return
      }
      descargarArchivo(hecho.data.blob, nombreDelPdf(nombre))
      if (visto.paginas.every((pagina) => pagina.capas.length === 0)) {
        avisar(MENSAJE_PDF_EN_BLANCO)
      }
      const faltan = textoDeImagenesQueFaltanEnElPdf(hecho.data.faltan)
      if (faltan !== null) {
        avisar(faltan)
      }
    } finally {
      enCurso.current = false
      setBajando(false)
    }
  }

  return { bajando, enLinea, descargar }
}
