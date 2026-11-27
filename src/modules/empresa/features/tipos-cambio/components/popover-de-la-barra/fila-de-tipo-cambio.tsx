'use client'

import { PencilIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { TipoCambioVigente } from '../../../../entities/tipos-cambio-vigentes'
import { ValorDeCambio } from '../valor-de-cambio'
import { EditorDeValor } from './editor-de-valor'
import { UltimoCambio } from './ultimo-cambio'

type Props = {
  tipo: TipoCambioVigente
  // Quien gestiona los tipos de cambio: ve el lápiz.
  puedeCambiar: boolean
  editando: boolean
  alEditar: () => void
  alDejarDeEditar: () => void
  releer: () => Promise<TipoCambioVigente[] | null>
  alRetener: (retener: boolean) => void
}

// Un tipo de cambio del popover: nombre y valor («1 USD = Bs 12,20», por <Monto>) y, debajo, quién y cuándo lo cambió por última vez. Quien
// puede, lo cambia ahí mismo con el lápiz (su nombre no lleva el monto: el CSS del Modo Live no alcanza un `aria-label`).
export function FilaDeTipoCambio(props: Props) {
  const { tipo, puedeCambiar, editando, alEditar, alDejarDeEditar, releer, alRetener } = props
  // «Recargar» tras un conflicto vuelve a montar el editor con lo releído.
  const [recargas, setRecargas] = useState(0)
  const lapiz = useRef<HTMLButtonElement>(null)

  return (
    <li className="grid min-w-0 gap-0.5 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="min-w-0 font-medium break-words text-(--color-ink)">{tipo.nombre}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <ValorDeCambio tipo={tipo} className="tabular-nums" />
          {puedeCambiar && !editando ? (
            <Button
              ref={lapiz}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Cambiar el valor de ${tipo.nombre}`}
              className="h-[44px] w-[44px] md:h-8 md:w-8"
              onClick={alEditar}
            >
              <PencilIcon aria-hidden />
            </Button>
          ) : null}
        </span>
      </div>
      <UltimoCambio cambio={tipo.ultimoCambio} />
      {puedeCambiar && editando ? (
        <EditorDeValor
          key={recargas}
          tipo={tipo}
          releer={releer}
          alRetener={alRetener}
          alRecargar={() => {
            setRecargas((n) => n + 1)
          }}
          alCerrar={() => {
            alDejarDeEditar()
            // El foco vuelve al lápiz de esta fila, que reaparece al cerrar el editor.
            requestAnimationFrame(() => lapiz.current?.focus())
          }}
        />
      ) : null}
    </li>
  )
}
