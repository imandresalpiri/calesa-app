'use client'

import type { ReactNode } from 'react'
import {
  mismaPieza,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../../entities/diseno/pieza-de-la-hoja'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'

type Props = {
  pieza: PiezaDeLaHoja
  // «la cabecera» o «la tarjeta del total».
  nombre: string
  // Lo que se lee si lo de adentro no dibuja nada (una cabecera sin modos ni «Ver total»).
  vacio: string
  apoyo: Pick<ApoyoDelLienzo, 'elegida' | 'rechazo' | 'ocupado' | 'elegir'>
  className?: string
  children: ReactNode
}

// Una pieza del lienzo que no se mueve ni se quita: la cabecera, o el resumen cuando la tarjeta del total no está en una sección (un diseño de antes). Lo de
// adentro va `inert` y encima el botón «Elegir la cabecera».
export function PiezaFija({ pieza, nombre, vacio, apoyo, className = '', children }: Props) {
  const texto = textoDeLaPieza(pieza)
  const elegida = mismaPieza(apoyo.elegida, pieza)
  const rechazo = apoyo.rechazo?.texto === texto ? apoyo.rechazo.mensaje : null
  const marco = elegida
    ? 'outline-2 outline-offset-2 outline-(--color-accent)'
    : rechazo !== null
      ? 'outline-2 outline-offset-2 outline-(--color-danger)'
      : 'hover:outline hover:outline-offset-2 hover:outline-(--color-line-strong)'
  return (
    <div
      data-pieza={texto}
      data-elegida={elegida ? '' : undefined}
      className={`relative min-w-0 rounded-(--radius-md) ${marco} ${className}`}
    >
      <div inert className="peer pointer-events-none">
        {children}
      </div>
      <p className="hidden rounded-(--radius-md) border border-dashed border-(--color-line-strong) p-3 text-(length:--text-sm) text-(--color-ink-soft) peer-empty:block">
        {vacio}
      </p>
      <button
        type="button"
        aria-label={`Elegir ${nombre}`}
        aria-pressed={elegida}
        aria-describedby={rechazo === null ? undefined : `rechazo-${texto}`}
        data-elegir={texto}
        disabled={apoyo.ocupado}
        onClick={() => {
          apoyo.elegir(pieza)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && elegida && e.target === e.currentTarget) {
            e.preventDefault()
            apoyo.elegir(null)
          }
        }}
        className="absolute inset-0 z-10 cursor-pointer rounded-(--radius-md) outline-none focus-visible:shadow-(--shadow-focus) disabled:cursor-wait"
      />
      {rechazo === null ? null : (
        <p id={`rechazo-${texto}`} className="mt-1 text-(length:--text-sm) text-(--color-danger)">
          {rechazo}
        </p>
      )}
    </div>
  )
}
