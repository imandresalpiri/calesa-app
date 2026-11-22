'use client'

import { TriangleAlertIcon } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { textoDelCampoQueFalta } from '../../../../../entities/campos-que-faltan'
import type { ContenidoDeLaFila } from '../../../../../entities/formula/contenido-de-c'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import {
  nombreDeLaCelda,
  type ColumnaDeLaPlanilla,
} from '../../../../../entities/formula/texto-de-la-celda'
import type { CifraDeLaFila } from '../../../../../entities/formula/vista-previa'
import { idDeLaCelda } from '../../../hooks/use-cuadricula'
import {
  ACTIVA,
  bordeDeReferencia,
  CELDA,
  COLUMNAS,
  CONCEPTO,
  EJEMPLO,
  EN_EDICION,
  FONDO_DEL_TIPO,
  NOMBRE_DE_LA_COLUMNA,
  NUMERO,
  PORCENTAJE,
  VALOR,
  VALOR_TEXTO,
} from './clases'
import { ContenidoDeB, ContenidoDeC, ContenidoDelEjemplo } from './contenido-de-la-celda'
import type { ValorDeLaUnidad } from './valor-de-la-unidad'

export type PropsDeLaFila = {
  fila: FilaDeLaHoja
  prefijo: string
  // La columna activa si la celda activa es de esta fila.
  activa: ColumnaDeLaPlanilla | null
  // La columna que se escribe y su entrada (sólo en la fila en edición).
  enEdicion: ColumnaDeLaPlanilla | null
  entrada: ReactNode
  // El «⋯» de la fila (sólo en la activa, sin edición).
  menu: ReactNode
  // El color de la referencia que nombra su B o su C en lo que se escribe.
  bordeB: number | undefined
  bordeC: number | undefined
  // El % de su B (`undefined`: la fila no tiene %).
  b: number | null | undefined
  constante: number | null | undefined
  unidad: ValorDeLaUnidad | undefined
  cifra: CifraDeLaFila
  leyendo: boolean
  // Qué muestran C y Ejemplo (calculado una vez por fórmula de trabajo: el mismo objeto mientras no cambie).
  contenido: ContenidoDeLaFila
  rechazo: string | null
  falta: string | null
  // Al arrastrar: si la fila cae antes o después de esta, y si es la que se arrastra.
  soltar: 'antes' | 'despues' | null
  arrastrada: boolean
}

type Col = ColumnaDeLaPlanilla

// Lo que lleva cada celda: el id del `aria-activedescendant`, la columna para los clics, el contorno de la activa y el borde de su referencia.
function celda(p: PropsDeLaFila, col: Col, clase: string, color?: number) {
  const activa = p.activa === col
  return {
    role: 'gridcell',
    id: idDeLaCelda(p.prefijo, { id: p.fila.id, col }),
    'data-col': col,
    'data-celda': `${col}${String(p.fila.numero)}`,
    'aria-selected': activa ? true : undefined,
    className: cn(clase, activa && ACTIVA, p.enEdicion === col && EN_EDICION),
    style: color === undefined ? undefined : bordeDeReferencia(color),
  } as const
}

// «C5, Remate, valor»; la columna Ejemplo, «Ejemplo 5, Remate».
const nombre = (p: PropsDeLaFila, col: Col) =>
  col === 'D'
    ? `${nombreDeLaCelda(col, p.fila.numero)}, ${p.fila.nodo.etiqueta}`
    : `${nombreDeLaCelda(col, p.fila.numero)}, ${p.fila.nodo.etiqueta}, ${NOMBRE_DE_LA_COLUMNA[col]}`

const BORDE = { B: 'bordeB', C: 'bordeC' } as const

// B, C y Ejemplo: el nombre dice la celda, la fila y la columna; el valor se lee por `aria-describedby` (nunca un monto en `aria-label`). `extra` va fuera del valor
// (el «⋯» de la fila, en Ejemplo).
function CeldaConValor(
  p: PropsDeLaFila & {
    col: 'B' | 'C' | 'D'
    clase: string
    vacia: boolean
    extra?: ReactNode
    children: ReactNode
  },
) {
  const id = idDeLaCelda(p.prefijo, { id: p.fila.id, col: p.col })
  const enEdicion = p.enEdicion === p.col
  return (
    <td
      {...celda(p, p.col, p.clase, p.col === 'D' ? undefined : p[BORDE[p.col]])}
      aria-label={nombre(p, p.col)}
      aria-describedby={enEdicion || p.vacia ? undefined : `${id}-v`}
    >
      {enEdicion ? p.entrada : p.vacia ? null : <span id={`${id}-v`}>{p.children}</span>}
      {p.extra}
    </td>
  )
}

function Concepto(p: PropsDeLaFila) {
  return (
    <td {...celda(p, 'A', CONCEPTO)} aria-label={nombre(p, 'A')}>
      {p.enEdicion === 'A' ? p.entrada : p.fila.nodo.etiqueta}
      {p.falta === null ? null : (
        <span
          data-falta-el-campo={p.falta}
          className="block text-(length:--text-xs) text-(--color-aviso-ink)"
        >
          {textoDelCampoQueFalta(p.falta)}
        </span>
      )}
      {p.rechazo === null ? null : (
        <TriangleAlertIcon aria-hidden className="ml-1 inline size-4 text-(--color-aviso-ink)" />
      )}
    </td>
  )
}

const MARCA_AL_SOLTAR = {
  antes: '[&>*]:border-t-2 [&>*]:border-t-(--color-primario-ink)',
  despues: '[&>*]:border-b-2 [&>*]:border-b-(--color-primario-ink)',
} as const

// Una fila de la cuadrícula: # (el asa para arrastrarla), A (el concepto), B (el %), C (lo que guarda la fórmula, con el fondo de su tipo de celda) y Ejemplo (lo
// que da con la unidad de ejemplo; en la activa, su «⋯»). Debajo, si lo hay, el rechazo de `validarFormula()` que la nombra. `memo` con valores simples: la planilla dibuja hasta 500.
export const FilaDeLaCuadricula = memo(function FilaDeLaCuadricula(p: PropsDeLaFila) {
  const { fila } = p
  return (
    <>
      <tr
        aria-rowindex={fila.numero + 1}
        data-fila={fila.id}
        {...(p.activa === null ? {} : { 'data-activa': '' })}
        {...(p.rechazo === null ? {} : { 'data-rechazo': '' })}
        {...(p.soltar === null ? {} : { 'data-soltar': p.soltar })}
        className={cn(p.soltar !== null && MARCA_AL_SOLTAR[p.soltar], p.arrastrada && 'opacity-50')}
      >
        <th scope="row" data-asa="" aria-roledescription="fila que se mueve" className={NUMERO}>
          {fila.numero}
        </th>
        <Concepto {...p} />
        <CeldaConValor {...p} col="B" clase={PORCENTAJE} vacia={p.b === undefined}>
          {p.b === undefined ? null : <ContenidoDeB valor={p.b} />}
        </CeldaConValor>
        <CeldaConValor
          {...p}
          col="C"
          clase={cn(
            p.contenido.c.tipo === 'valor_fijo' ? VALOR : VALOR_TEXTO,
            FONDO_DEL_TIPO[fila.tipo],
          )}
          vacia={false}
        >
          <ContenidoDeC nodo={fila.nodo} contenido={p.contenido.c} constante={p.constante} />
        </CeldaConValor>
        <CeldaConValor
          {...p}
          col="D"
          clase={EJEMPLO}
          vacia={p.contenido.ejemplo === 'nada'}
          extra={p.menu}
        >
          <ContenidoDelEjemplo
            nodo={fila.nodo}
            ejemplo={p.contenido.ejemplo}
            unidad={p.unidad}
            cifra={p.cifra}
            leyendo={p.leyendo}
          />
        </CeldaConValor>
      </tr>
      {p.rechazo === null ? null : (
        <tr>
          <td
            colSpan={COLUMNAS}
            className={`${CELDA} bg-(--color-aviso-soft) text-(--color-aviso-ink)`}
          >
            <span role="alert">{p.rechazo}</span>
          </td>
        </tr>
      )}
    </>
  )
})
