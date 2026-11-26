'use client'

import { FileTextIcon } from 'lucide-react'
import type { Resultado } from '@/shared/lib/errores'
import { useLecturaAlMontar } from './use-lectura-al-montar'
import type { ArchivoDeLaZona } from './use-archivo-de-la-zona'

type Props = {
  archivo: ArchivoDeLaZona
  pedirUrl: () => Promise<Resultado<string>>
}

const CAJA =
  'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--color-line) bg-(--color-surface-2)'

// La vista previa de lo subido: la miniatura de una imagen (su URL firmada se pide una vez, al dibujarse) o el icono de un PDF. Mide siempre lo mismo, lea o falle.
export function MiniaturaDeArchivo({ archivo, pedirUrl }: Props) {
  const { lectura } = useLecturaAlMontar(archivo.esImagen ? pedirUrl : sinUrl, archivo.clave)
  if (archivo.esImagen && lectura.estado === 'leido') {
    return (
      <span className={CAJA}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de 60 s de un bucket privado: next/image no la puede optimizar. */}
        <img
          src={lectura.dato}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          data-vista-previa=""
        />
      </span>
    )
  }
  return (
    <span className={CAJA} aria-hidden>
      <FileTextIcon className="size-8 text-(--color-ink-soft)" />
    </span>
  )
}

function sinUrl(): Promise<Resultado<string>> {
  return Promise.resolve({ ok: false, error: { codigo: 'inesperado', mensaje: '' } })
}
