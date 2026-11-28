'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import type { ImagenDeArte } from '../../../entities/tipos'
import { leerUsosDeLaImagen } from '../actions/leer-usos-de-la-imagen'
import { quitarImagenDeArte } from '../actions/quitar-imagen-de-arte'

const NO_SE_LEYO = 'No pudimos leer la imagen. Recarga.'

// La confirmación de quitar una imagen: al abrirse (`apertura` cambia en cada una) pregunta cuántas plantillas de arte la usan; con alguna,
// «Quitar» queda apagado. Si mientras tanto alguien la usó, la RPC no la quita y devuelve los usos: se dicen en la misma línea.
export function useQuitarImagen({
  imagen,
  apertura,
}: {
  imagen: ImagenDeArte | null
  apertura: string
}) {
  const usos = useAction(leerUsosDeLaImagen)
  const quitar = useAction(quitarImagenDeArte)
  const [rechazo, setRechazo] = useState<{ apertura: string; usos: number } | null>(null)
  const { lectura, reintentar } = useLecturaAlMontar(
    () =>
      imagen === null
        ? Promise.resolve(ok(0))
        : enviarAccion(usos.executeAsync({ id: imagen.id }), NO_SE_LEYO),
    apertura,
  )
  const usosDelRechazo = rechazo?.apertura === apertura ? rechazo.usos : null
  const leidos = lectura.estado === 'leido' ? lectura.dato : null
  return {
    usos: usosDelRechazo ?? leidos,
    leyendo: lectura.estado === 'leyendo',
    fallo: lectura.estado === 'fallo' ? lectura.error.mensaje : null,
    reintentar,
    enCurso: quitar.isPending,
    // `true` si la quitó (o ya no estaba): la confirmación se cierra.
    quitar: async (): Promise<boolean> => {
      if (imagen === null) {
        return true
      }
      const hecho = await enviarAccion(
        quitar.executeAsync({ id: imagen.id, actualizadoEnEsperado: imagen.actualizadoEn }),
        NO_SE_LEYO,
      )
      if (!hecho.ok) {
        avisarError(hecho.error)
        return false
      }
      if ('usos' in hecho.data) {
        setRechazo({ apertura, usos: hecho.data.usos })
        return false
      }
      avisarExito(`Imagen «${imagen.nombre}» quitada de la biblioteca.`)
      return true
    },
  }
}
