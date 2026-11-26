'use client'

import type {
  CeldaComparada as Celda,
  Diferencia,
  FormatoDeFila,
} from '../../../../entities/aprobada/comparar'
import { ValorDeNodo } from '../../../hoja/components/valor-de-nodo'

// Lo que se dice de una celda distinta de la primera columna: la flecha para quien mira (sin cifras) y el texto para quien lee en voz alta.
const MARCA: Record<Exclude<Diferencia, 'igual'>, { flecha: string; texto: string }> = {
  mas: { flecha: '↑', texto: 'Más que la primera' },
  menos: { flecha: '↓', texto: 'Menos que la primera' },
  distinta: { flecha: '≠', texto: 'Distinta de la primera' },
}

export const NO_ESTA_EN_ESTA_VERSION = 'No está en esta versión'

// La marca de lo distinto: flecha `aria-hidden` y su texto `sr-only`. Ninguna cifra en un `aria-label` ni en un `title` (Modo Live).
export function MarcaDeDiferencia({ diferencia }: { diferencia: Diferencia }) {
  if (diferencia === 'igual') {
    return null
  }
  const { flecha, texto } = MARCA[diferencia]
  return (
    <>
      <span aria-hidden className="ms-1 font-semibold text-(--color-primario-ink)">
        {flecha}
      </span>
      <span className="sr-only">{texto}</span>
    </>
  )
}

function Valor({
  celda,
  formato,
  decimales,
}: {
  celda: Extract<Celda, { tipo: 'valor' }>
  formato: FormatoDeFila
  decimales: number | undefined
}) {
  if (formato === 'texto') {
    return typeof celda.valor === 'string' ? (
      <span>{celda.valor}</span>
    ) : (
      <span aria-label="Sin valor">—</span>
    )
  }
  return (
    <ValorDeNodo
      valor={typeof celda.valor === 'number' ? celda.valor : null}
      formato={formato}
      decimales={decimales}
    />
  )
}

// Una celda de la tabla de comparar: «—» si la versión no tiene el nodo (o quien mira no lo ve en ella), el valor con su formato (el dinero por `<Monto>`) y, si es
// distinto de la primera columna, el fondo de acento y la flecha. Una columna que no se pudo leer deja la celda vacía (su cabecera lo dice).
export function CeldaComparada({
  celda,
  formato,
  decimales,
  nodo,
  columna,
}: {
  celda: Celda
  formato: FormatoDeFila
  // Los «Decimales» de la fila (glosario); sin ellos, «Automático».
  decimales: number | undefined
  nodo: string
  columna: string
}) {
  const distinta = celda.tipo === 'valor' && celda.diferencia !== 'igual'
  return (
    <td
      data-celda-comparada=""
      data-nodo={nodo}
      data-columna={columna}
      data-distinta={distinta ? '' : undefined}
      className={`border-t border-(--color-line) px-3 py-2 align-top ${
        formato === 'texto' ? 'text-left' : 'text-right tabular-nums'
      } ${distinta ? 'bg-(--color-primario-soft)' : ''}`}
    >
      {celda.tipo === 'falta' ? (
        <>
          <span aria-hidden className="text-(--color-ink-faint)">
            —
          </span>
          <span className="sr-only">{NO_ESTA_EN_ESTA_VERSION}</span>
        </>
      ) : celda.tipo === 'valor' ? (
        <>
          <Valor celda={celda} formato={formato} decimales={decimales} />
          <MarcaDeDiferencia diferencia={celda.diferencia} />
        </>
      ) : null}
    </td>
  )
}
