'use client'

import { useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { avisarError } from './toasts'

export type ArchivoDeLaZona = {
  // Cambia con el archivo: la vista previa se pide otra vez sólo cuando cambia.
  clave: string
  nombre: string
  esImagen: boolean
}

type Args = {
  // La ruta ya subida (vacía = sin archivo) y qué hacer cuando cambia.
  ruta: string
  alCambiar: (ruta: string) => void
  // Subir el archivo elegido: devuelve la ruta (el módulo valida tipo y peso).
  subir: (archivo: File) => Promise<Resultado<string>>
  // Una URL firmada y corta para ver lo subido.
  pedirUrl: (ruta: string) => Promise<Resultado<string>>
  // Cómo se llama en la zona un archivo que no se acaba de elegir (la ruta guarda el hash, no el nombre).
  nombreSinElegir: string
}

const MENSAJE_AL_SUBIR = 'No se pudo subir el archivo. Prueba de nuevo.'
const MENSAJE_AL_ABRIR = 'No se pudo abrir el archivo. Prueba de nuevo.'

// El estado de una zona de archivo (`<ZonaDeArchivo>`): sube al elegir, recuerda el último archivo para «Reintentar» y su nombre mientras la zona está abierta, y abre lo subido con una URL de 60 s.
export function useArchivoDeLaZona({ ruta, alCambiar, subir, pedirUrl, nombreSinElegir }: Args) {
  const [subiendo, setSubiendo] = useState(false)
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)
  const [elegido, setElegido] = useState<{ ruta: string; nombre: string } | null>(null)
  const [ultimo, setUltimo] = useState<File | null>(null)

  async function elegir(archivo: File | undefined) {
    if (!archivo) {
      return
    }
    setUltimo(archivo)
    setRechazo(null)
    setSubiendo(true)
    const resultado = await subir(archivo).catch(() => fallo('inesperado', MENSAJE_AL_SUBIR))
    setSubiendo(false)
    if (resultado.ok) {
      setElegido({ ruta: resultado.data, nombre: archivo.name })
      alCambiar(resultado.data)
    } else {
      setRechazo(resultado.error)
    }
  }

  async function ver() {
    const resultado = await pedirUrl(ruta).catch(() => fallo('inesperado', MENSAJE_AL_ABRIR))
    if (resultado.ok) {
      window.open(resultado.data, '_blank', 'noopener,noreferrer')
    } else {
      avisarError(resultado.error)
    }
  }

  const extension = ruta.split('.').pop()?.toLowerCase() ?? ''
  const archivo: ArchivoDeLaZona | null =
    ruta === ''
      ? null
      : {
          clave: ruta,
          nombre: elegido?.ruta === ruta ? elegido.nombre : `${nombreSinElegir}.${extension}`,
          esImagen: extension !== 'pdf',
        }

  return {
    archivo,
    subiendo,
    rechazo: rechazo?.mensaje ?? null,
    // Un archivo rechazado por tipo o peso no mejora al repetirlo; uno que no llegó a la red, sí.
    puedeReintentar: rechazo !== null && rechazo.codigo !== 'validacion' && ultimo !== null,
    elegir,
    reintentar: () => elegir(ultimo ?? undefined),
    quitar: () => {
      setRechazo(null)
      alCambiar('')
    },
    ver,
    pedirUrl: () => pedirUrl(ruta),
  }
}
