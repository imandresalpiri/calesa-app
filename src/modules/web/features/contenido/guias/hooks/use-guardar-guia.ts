'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { GuiaCompleta } from '../../../../entities/contenido/guias'
import {
  MOTIVO_SUBIENDO_IMAGENES,
  motivoDelCuerpo,
  rutasDeImagenes,
} from '../../../../entities/contenido/guias'
import type { PublicacionDeGuia } from '../../../../entities/contenido/repositorios'
import { haySubiendo } from '../../editor/bloques/subidas.client'
import { guardarGuia } from '../actions/guardar-guia'
import { quitarImagenesHuerfanas } from './quitar-imagenes-huerfanas'
import type { ValoresDeGuia } from './valores-de-guia'

export type ErroresDeGuia = Partial<Record<string, string>>

type Opciones = {
  guia: GuiaCompleta
  valores: ValoresDeGuia
  // Después de guardar o de recargar: lo tipeado ya no hace falta (limpia el borrador).
  alGuardar: () => void
}

const motivoParaNoGuardar = (cuerpo: unknown): string | null =>
  haySubiendo() ? MOTIVO_SUBIENDO_IMAGENES : motivoDelCuerpo(cuerpo)

const rutasDeLosValores = (valores: ValoresDeGuia): string[] => [
  ...rutasDeImagenes(valores.cuerpo),
  ...(valores.portadaRuta === '' ? [] : [valores.portadaRuta]),
]

// Guardar la guía, con o sin cambio de publicación (un solo envío con la versión esperada). Lo tipeado queda siempre: un error se dice junto a su
// campo (la dirección repetida, el cuerpo rechazado) y un conflicto con `<AvisoDeConflicto>`. Con éxito, la revalidación trae la guía nueva y la
// página vuelve a montar el formulario (su `key` es la versión).
export function useGuardarGuia({ guia, valores, alGuardar }: Opciones) {
  const router = useRouter()
  const { executeAsync, result, isPending } = useAction(guardarGuia)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<ErroresDeGuia>({})
  // Hasta que llega la guía nueva el formulario sigue apagado: lo tipeado entre el «guardado» y el nuevo montaje se perdería.
  const [refrescando, refrescar] = useTransition()

  async function guardar(publicacion: PublicacionDeGuia, mensaje: string): Promise<void> {
    // Un bloque que la lista blanca no admite (un botón sin enlace, un video de otro sitio) no se envía: se dice en su lugar, con lo escrito intacto.
    // Una foto que aún sube no está en el documento: guardar ahora la dejaría fuera (y su archivo huérfano).
    const rechazado = motivoParaNoGuardar(valores.cuerpo)
    if (rechazado !== null) {
      setPorCampo({ cuerpo: rechazado })
      return
    }
    setPorCampo({})
    const respuesta = await conRed(
      executeAsync({
        id: guia.id,
        actualizadoEnEsperado: guia.actualizadoEn,
        titulo: valores.titulo,
        slug: valores.slug,
        resumen: valores.resumen,
        categoriaId: valores.categoriaId === '' ? null : valores.categoriaId,
        autorId: valores.autorId === '' ? null : valores.autorId,
        portadaRuta: valores.portadaRuta === '' ? null : valores.portadaRuta,
        seoTitulo: valores.seoTitulo,
        seoDescripcion: valores.seoDescripcion,
        cuerpoDoc: valores.cuerpo,
        publicacion,
      }),
    )
    const resultado = resultadoDeAccion(respuesta)
    if (resultado.ok) {
      avisarExito(mensaje)
      quitarImagenesHuerfanas(
        [...rutasDeImagenes(guia.cuerpoDoc), ...(guia.portadaRuta ? [guia.portadaRuta] : [])],
        rutasDeLosValores(valores),
      )
      alGuardar()
      refrescar(() => {
        router.refresh()
      })
      return
    }
    if (resultado.error.codigo === 'conflicto') {
      setConflicto(resultado.error.mensaje)
      return
    }
    const delCampo =
      respuesta.data && 'porCampo' in respuesta.data ? respuesta.data.porCampo : undefined
    if (delCampo) {
      setPorCampo(delCampo)
    } else if (resultado.error.codigo !== 'validacion') {
      avisarError(resultado.error)
    }
  }

  // Toma la versión nueva: descarta lo tipeado y vuelve a pedir la página.
  function recargar(): void {
    alGuardar()
    setConflicto(null)
    router.refresh()
  }

  const deValidacion = Object.fromEntries(
    Object.entries(result.validationErrors?.fieldErrors ?? {}).map(([campo, mensajes]) => [
      campo,
      (mensajes as string[] | undefined)?.[0],
    ]),
  )
  return {
    guardar,
    recargar,
    enCurso: isPending || refrescando,
    conflicto,
    errores: { ...deValidacion, ...porCampo } as ErroresDeGuia,
  }
}
