'use client'

import type { AccionDeMenu } from '@/shared/ui/lista'
import { MasAcciones } from '@/shared/ui/lista'
import type { AccionDeCasilla, PropsDeCasilla, PropsDeLibre } from './cuerpo'
import { LugarDelAsa } from './lugar-del-asa'

const MOTIVO_PRIMERA = 'Ya es la primera.'
const MOTIVO_ULTIMA = 'Ya es la última.'

function accionesDeCasilla(
  posicion: number,
  total: number,
  quitar: string,
  alElegir: (accion: AccionDeCasilla) => void,
): AccionDeMenu[] {
  const linea = (clave: AccionDeCasilla, etiqueta: string, motivo: string | null) => [
    {
      tipo: 'accion' as const,
      clave,
      etiqueta,
      deshabilitada: motivo !== null,
      alElegir: () => {
        alElegir(clave)
      },
    },
    ...(motivo === null
      ? []
      : [{ tipo: 'nota' as const, clave: `${clave}-motivo`, texto: motivo }]),
  ]
  return [
    ...linea('subir', 'Subir', posicion === 0 ? MOTIVO_PRIMERA : null),
    ...linea('bajar', 'Bajar', posicion === total - 1 ? MOTIVO_ULTIMA : null),
    { tipo: 'separador', clave: 'separador-quitar' },
    ...linea('quitar', quitar, null),
  ]
}

// Un lugar lleno de las casillas: su número, qué dato es y de dónde sale. Con permiso, el asa y su «⋯» (subir, bajar, quitar).
export function CasillaLlena(props: PropsDeCasilla) {
  const { casilla, posicion, total, quitar, zona, puedeGestionar, alElegir } = props
  const { alMontar, estilo, asa } = props
  return (
    <li
      ref={alMontar}
      style={estilo}
      data-casilla={casilla.llave}
      className="flex min-h-[60px] min-w-0 items-center gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) py-1 pr-1 pl-2"
    >
      {puedeGestionar ? (asa ?? <LugarDelAsa />) : null}
      <span
        aria-hidden
        className="w-5 shrink-0 text-center text-(length:--text-sm) text-(--color-ink-faint) tabular-nums"
      >
        {posicion + 1}
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-medium break-words text-(--color-ink)">{casilla.etiqueta}</span>
        <span className="text-(length:--text-sm) break-words text-(--color-ink-faint)">
          {casilla.deDonde}
        </span>
      </span>
      {puedeGestionar ? (
        <MasAcciones
          nombre={`${casilla.etiqueta} en ${zona}`}
          acciones={accionesDeCasilla(posicion, total, quitar, (accion) => {
            alElegir(posicion, accion)
          })}
        />
      ) : null}
    </li>
  )
}

// Un lugar vacío: recibe lo que se suelta encima (el campo o el dato común queda en ese lugar o en el primero libre).
export function CasillaLibre({ posicion, zona, alMontar }: PropsDeLibre) {
  return (
    <li
      ref={alMontar}
      data-casilla-libre={posicion}
      className="flex min-h-[60px] min-w-0 items-center gap-2 rounded-(--radius-card) border border-dashed border-(--color-line) px-3 text-(--color-ink-faint)"
    >
      <span aria-hidden className="w-5 shrink-0 text-center text-(length:--text-sm) tabular-nums">
        {posicion + 1}
      </span>
      <span>
        Libre<span className="sr-only">: un lugar de {zona}</span>
      </span>
    </li>
  )
}
