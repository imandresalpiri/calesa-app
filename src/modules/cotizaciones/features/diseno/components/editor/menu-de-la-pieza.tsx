'use client'

import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista/mas-acciones'

type Props = {
  // «Precio», «la tarjeta del total» o «la sección «Base»».
  nombre: string
  puedeMover: { antes: boolean; despues: boolean }
  ocupado: boolean
  alMover: (paso: -1 | 1) => void
  alQuitar: () => void
  // «Quitar» o «Quitar la sección»; apagado con su motivo (la última sección).
  quitar?: { etiqueta: string; motivo: string | null }
}

// El «⋯» de una pieza o una sección del lienzo: Mover antes, Mover después y Quitar (se hace y ofrece «Deshacer»).
export function MenuDeLaPieza({ nombre, puedeMover, ocupado, alMover, alQuitar, quitar }: Props) {
  const motivo = quitar?.motivo ?? null
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'antes',
      etiqueta: 'Mover antes',
      deshabilitada: ocupado || !puedeMover.antes,
      alElegir: () => {
        alMover(-1)
      },
    },
    {
      tipo: 'accion',
      clave: 'despues',
      etiqueta: 'Mover después',
      deshabilitada: ocupado || !puedeMover.despues,
      alElegir: () => {
        alMover(1)
      },
    },
    { tipo: 'separador', clave: 'separador' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: quitar?.etiqueta ?? 'Quitar',
      destructiva: true,
      deshabilitada: ocupado || motivo !== null,
      alElegir: alQuitar,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota' as const, clave: 'motivo', texto: motivo }]),
  ]
  return <MasAcciones nombre={nombre} acciones={acciones} conBorde />
}
