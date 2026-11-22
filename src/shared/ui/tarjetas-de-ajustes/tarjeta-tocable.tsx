'use client'

import type { ReactNode } from 'react'
import { MasAcciones, type AccionDeMenu } from '../lista'
import { TarjetaDeAjustes } from './tarjeta-de-ajustes'
import { ToqueDeLaTarjeta } from './toque-de-la-tarjeta'

type Props = {
  titulo: string
  // La acción principal: el nombre del botón que cubre la tarjeta («Editar colores») y, con «…», su línea en el «⋯».
  accion: string
  // Cómo la dice el «⋯» si no es `<accion>…` («Editar…»).
  etiquetaDelMenu?: string
  abrir: () => void
  // Por qué no se puede editar (o `null`): apaga la acción en el «⋯», lo dice ahí y la tarjeta no abre nada.
  motivo: string | null
  estado?: ReactNode
  // Más acciones de la entidad, después de la principal en el «⋯».
  extra?: AccionDeMenu[]
  children: ReactNode
}

// Una tarjeta de ajustes que se edita en un modal y no dibuja ningún botón suelto: sólo su «⋯» arriba a la derecha, con la lista única de acciones de la
// entidad, y tocar la tarjeta abre la primera. Con el teclado, la tarjeta es un botón con nombre («Editar colores») y el «⋯» va aparte («Más acciones de Colores»).
export function TarjetaTocable({
  titulo,
  accion,
  etiquetaDelMenu,
  abrir,
  motivo,
  estado,
  extra = [],
  children,
}: Props) {
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: etiquetaDelMenu ?? `${accion}…`,
      principal: true,
      deshabilitada: motivo !== null,
      despuesDeCerrar: true,
      alElegir: abrir,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
    ...extra,
  ]
  return (
    <TarjetaDeAjustes
      titulo={titulo}
      estado={estado}
      toque={motivo === null ? <ToqueDeLaTarjeta etiqueta={accion} abrir={abrir} /> : undefined}
      acciones={<MasAcciones nombre={titulo} acciones={acciones} />}
    >
      {children}
    </TarjetaDeAjustes>
  )
}
