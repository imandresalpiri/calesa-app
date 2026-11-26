'use client'

import type { ReactNode } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { useALaVista } from '@/shared/ui/use-a-la-vista'

type Props = {
  titulo: string
  children: ReactNode
}

// Un hueco del resumen de un grupo: una sección a la vista cuyo contenido se monta la primera vez que llega a 200 px de la vista; después queda montado, para no perder
// lo que la persona escribió. Hasta entonces no se monta nada ni se pide el código del área que lo llena.
export function HuecoDelGrupo({ titulo, children }: Props) {
  const [observar, cerca] = useALaVista<HTMLDivElement>()
  return (
    <div ref={observar}>
      <Bloque titulo={titulo}>{cerca ? children : null}</Bloque>
    </div>
  )
}
