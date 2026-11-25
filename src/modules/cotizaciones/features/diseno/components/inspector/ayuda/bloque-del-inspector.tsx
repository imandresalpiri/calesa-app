'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista/mas-acciones'
import type { TipoDeBloque } from '../../../../../entities/diseno'
import { NOMBRES_DE_BLOQUE } from '../../../../../entities/diseno/edicion-de-la-ayuda'

type Props = {
  // El prefijo de los ids de la ayuda de esta celda: el «⋯» de cada bloque es `<prefijo>-<i>-mas` (`useFocoTrasMover` lo busca tras mover).
  prefijo: string
  indice: number
  total: number
  tipo: TipoDeBloque
  ocupado: boolean
  // El rechazo de forma que cae en este bloque (`errorDelBloque()`): lo marca, con texto (sus campos dicen qué falta).
  conError: boolean
  alMover: (destino: number) => void
  alQuitar: () => void
  children: ReactNode
}

export const COMPLETA_EL_BLOQUE = 'Completa este bloque.'

const esCampo = (el: EventTarget) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement

// Un bloque de la ayuda en el inspector: su cabecera (número y tipo) con el «⋯» (Mover antes, Mover después y Quitar, que ofrece «Deshacer») y sus campos.
// Alt+↑/↓ lo mueve con el foco en el bloque o en su «⋯» (no en un campo: ahí las flechas son del texto), como una pieza del lienzo (`useTeclasDeLaPieza`).
export function BloqueDelInspector({
  prefijo,
  indice,
  total,
  tipo,
  ocupado,
  conError,
  alMover,
  alQuitar,
  children,
}: Props) {
  const numero = String(indice + 1)
  const nombre = `${NOMBRES_DE_BLOQUE[tipo]} (bloque ${numero})`
  const puede = { antes: indice > 0, despues: indice < total - 1 }
  const teclas = (e: KeyboardEvent<HTMLElement>) => {
    if (!e.altKey || esCampo(e.target) || ocupado) return
    const paso = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (paso === 0 || !(paso === -1 ? puede.antes : puede.despues)) return
    e.preventDefault()
    alMover(indice + paso)
  }
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'antes',
      etiqueta: 'Mover antes',
      deshabilitada: ocupado || !puede.antes,
      despuesDeCerrar: true,
      alElegir: () => {
        alMover(indice - 1)
      },
    },
    {
      tipo: 'accion',
      clave: 'despues',
      etiqueta: 'Mover después',
      deshabilitada: ocupado || !puede.despues,
      despuesDeCerrar: true,
      alElegir: () => {
        alMover(indice + 1)
      },
    },
    { tipo: 'separador', clave: 'separador' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar',
      destructiva: true,
      deshabilitada: ocupado,
      alElegir: alQuitar,
    },
  ]
  return (
    <li
      data-bloque-de-la-ayuda={tipo}
      aria-labelledby={`${prefijo}-${String(indice)}-nombre`}
      onKeyDown={teclas}
      className={`grid min-w-0 gap-2 rounded-(--radius-md) border p-2 ${conError ? 'border-(--color-peligro)' : 'border-(--color-line)'}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h5
          id={`${prefijo}-${String(indice)}-nombre`}
          className="min-w-0 text-(length:--text-sm) font-medium break-words text-(--color-ink)"
        >
          {numero}. {NOMBRES_DE_BLOQUE[tipo]}
        </h5>
        <MasAcciones
          nombre={nombre}
          id={`${prefijo}-${String(indice)}-mas`}
          acciones={acciones}
          conBorde
        />
      </div>
      {conError ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{COMPLETA_EL_BLOQUE}</p>
      ) : null}
      {children}
    </li>
  )
}
