'use client'

import type { CSSProperties } from 'react'
import type { EstadoDeLaMarca } from '../../../../entities/diseno/soltar-en-la-rejilla'
import type { MarcaDibujada } from '../../hooks/caida-bajo-el-punto'
import { A_TAMANO_REAL } from './marco-escalado'

const COLOR: Readonly<Record<EstadoDeLaMarca, { caja: string; texto: string }>> = {
  libre: {
    caja: 'border-(--color-primario) bg-(--color-primario-soft)',
    texto: 'text-(--color-primario-oscuro)',
  },
  pisa: {
    caja: 'border-(--color-peligro) bg-(--color-peligro-soft)',
    texto: 'text-(--color-peligro-ink)',
  },
  se_sale: {
    caja: 'border-(--color-peligro) bg-(--color-peligro-soft)',
    texto: 'text-(--color-peligro-ink)',
  },
  no_admite: {
    caja: 'border-(--color-peligro) bg-(--color-peligro-soft)',
    texto: 'text-(--color-peligro-ink)',
  },
  apilada: {
    caja: 'border-(--color-line-strong) bg-(--color-surface-2)',
    texto: 'text-(--color-ink-soft)',
  },
}

// Sin recuadro (una avanzada, o la rejilla que apila), la marca cubre todo el lugar.
const lugarDe = (m: MarcaDibujada): CSSProperties =>
  m.recuadro === null
    ? { inset: 0, pointerEvents: 'none' }
    : {
        left: m.recuadro.izquierda,
        top: m.recuadro.arriba,
        width: m.recuadro.ancho,
        height: m.recuadro.alto,
        pointerEvents: 'none',
      }

// La marca de lo que se arrastra sobre el lugar `en` (una rejilla o una avanzada, que la contiene con `relative`): el recuadro que ocuparía la pieza, en el
// color de lo que pasaría al soltar (libre; pisa, no entra o no va ahí; la vista apila), con su texto («Columna 7, fila 2», «Ahí está «Flete».»). Nada se
// corre mientras se arrastra: es lo único que cambia. El texto lo anuncia el arrastre; la marca es sólo para la vista.
export function MarcaEnLaRejilla({ marca, en }: { marca: MarcaDibujada | null; en: string }) {
  if (marca?.en !== en) return null
  const color = COLOR[marca.estado]
  return (
    <div
      aria-hidden
      data-marca-de-soltar={marca.estado}
      style={lugarDe(marca)}
      className={`absolute z-30 rounded-(--radius-md) border-2 border-dashed ${color.caja}`}
    >
      <span
        className={`${A_TAMANO_REAL} absolute top-1 left-1 max-w-[calc(100%-0.5rem)] rounded-(--radius-sm) bg-(--color-surface) px-1.5 py-0.5 text-(length:--text-xs) font-medium shadow-(--shadow-sm) ${color.texto}`}
      >
        {marca.texto}
      </span>
    </div>
  )
}
