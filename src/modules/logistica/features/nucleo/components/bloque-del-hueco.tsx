'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

type Props = {
  // La clave del hueco (`ORDEN_DE_HUECOS`): con ella el atajo de una falta encuentra el bloque.
  clave: string
  titulo: string
  // Su contenido se monta de una vez, sin esperar a acercarse.
  abiertoAlInicio?: boolean
  children: ReactNode
}

// Un hueco del panel de la unidad: una sección a la vista cuyo contenido se monta la primera vez que llega a 200 px de la vista (`useALaVista`). Hasta entonces no se
// monta nada ni se pide el código del área que lo llena; después queda montado, para no perder lo que la persona escribió. Un aviso «abre ese hueco» (el atajo de una
// falta, 6.04) lo trae a la vista y le lleva el foco a su título.
export function BloqueDelHueco({ clave, titulo, abiertoAlInicio = false, children }: Props) {
  const [observar, cerca] = useALaVista<HTMLDivElement>()
  const envoltura = useRef<HTMLDivElement>(null)
  useAlPedirAbrirElHueco(clave, () => {
    const seccion = envoltura.current?.querySelector('[data-slot="bloque"]')
    if (!seccion) return
    seccion.scrollIntoView({ block: 'nearest' })
    seccion.querySelector<HTMLElement>('[tabindex="-1"]')?.focus()
  })
  return (
    <div ref={envoltura} {...{ [ATRIBUTO_DEL_BLOQUE]: clave }}>
      <div ref={observar}>
        <Bloque titulo={titulo}>{abiertoAlInicio || cerca ? children : null}</Bloque>
      </div>
    </div>
  )
}
