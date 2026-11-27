'use client'

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Textarea } from '@/shared/ui/textarea'
import { MAXIMO_DE_CARACTERES_DE_UN_RETOQUE } from '../../../../entities/cuadricula-de-la-tarjeta'
import { caracteres } from '../../../../entities/json-de-la-base'
import type { CeldaDibujada } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LugarDelCampo } from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'

// El campo, encima de la celda, no es más angosto que esto (recortado al marco de la tarjeta).
const ANCHO_MINIMO_EN_LA_CELDA = 240

type Props = {
  celda: CeldaDibujada
  texto: string
  lugar: LugarDelCampo
  escala: number
  // El ancho de la tarjeta escalada: el campo en la celda no se sale de él.
  anchoDelMarco: number
  error: string | null
  enCurso: boolean
  alEscribir: (texto: string) => void
  alDejar: () => void
  alCancelar: () => void
}

// Bajo el campo: «n de 300», el motivo si pasa y el error de la base para esta celda.
function PieDelCampo({
  id,
  n,
  largo,
  error,
}: {
  id: string
  n: number
  largo: boolean
  error: string | null
}) {
  const maximo = String(MAXIMO_DE_CARACTERES_DE_UN_RETOQUE)
  return (
    <>
      <p id={`${id}-n`} className="text-xs text-(--color-ink-soft) tabular-nums">
        {String(n)} de {maximo}
      </p>
      {largo ? (
        <p id={`${id}-m`} className="text-xs text-(--color-peligro-ink)">
          Tiene {String(n)} caracteres: el máximo es {maximo}.
        </p>
      ) : null}
      {error === null ? null : (
        <p id={`${id}-e`} role="alert" className="text-xs text-(--color-peligro-ink)">
          {error}
        </p>
      )}
    </>
  )
}

// Dónde va el campo: a lo ancho del modal, con su título, o encima de la celda (no más angosto que `ANCHO_MINIMO_EN_LA_CELDA`, recortado al marco).
function MarcoDelCampo({
  celda,
  lugar,
  escala,
  anchoDelMarco,
  children,
}: Pick<Props, 'celda' | 'lugar' | 'escala' | 'anchoDelMarco'> & { children: ReactNode }) {
  if (lugar === 'ancho_del_modal') {
    return (
      <div data-campo-del-retoque="ancho_del_modal" className="grid gap-1">
        <p className="text-(length:--text-sm) font-medium">Texto de la celda</p>
        {children}
      </div>
    )
  }
  const ancho = Math.min(anchoDelMarco, Math.max(ANCHO_MINIMO_EN_LA_CELDA, celda.ancho * escala))
  return (
    <div
      data-campo-del-retoque="en_la_celda"
      className="absolute z-20 grid gap-1 rounded-(--radius-md) bg-(--color-surface) p-1 shadow-lg ring-1 ring-(--color-border)"
      style={{
        left: Math.max(0, Math.min(celda.x * escala, anchoDelMarco - ancho)),
        top: celda.y * escala,
        width: ancho,
      }}
    >
      {children}
    </div>
  )
}

// El texto de una celda: «n de 300» en code points y, si pasa, su motivo junto a él (sin `maxLength`: el texto largo queda y la celda se marca). Enter lo deja
// (también largo), Mayús+Enter es un salto de línea y Esc lo cancela (sin cerrar el modal). Encima de la celda, o a lo ancho del modal bajo la tarjeta cuando
// no se escribiría cómodo (`lugarDelCampo()`).
export function CampoDelRetoque({
  celda,
  texto,
  lugar,
  escala,
  anchoDelMarco,
  error,
  enCurso,
  alEscribir,
  alDejar,
  alCancelar,
}: Props) {
  const id = useId()
  const campo = useRef<HTMLTextAreaElement>(null)
  const n = caracteres(texto)
  const largo = n > MAXIMO_DE_CARACTERES_DE_UN_RETOQUE
  useEffect(() => {
    const t = campo.current
    if (t === null) return
    if (lugar === 'ancho_del_modal') t.scrollIntoView({ block: 'nearest' })
    t.focus()
    t.setSelectionRange(t.value.length, t.value.length)
  }, [celda.id, lugar])
  const teclas = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      alDejar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      alCancelar()
    }
  }
  return (
    <MarcoDelCampo celda={celda} lugar={lugar} escala={escala} anchoDelMarco={anchoDelMarco}>
      <Textarea
        ref={campo}
        aria-label="Texto de la celda"
        value={texto}
        disabled={enCurso}
        aria-invalid={largo || error !== null}
        aria-describedby={`${id}-n${largo ? ` ${id}-m` : ''}${error === null ? '' : ` ${id}-e`}`}
        className="min-h-10 bg-(--color-surface)"
        onChange={(e) => {
          alEscribir(e.target.value)
        }}
        onKeyDown={teclas}
      />
      <PieDelCampo id={id} n={n} largo={largo} error={error} />
    </MarcoDelCampo>
  )
}
