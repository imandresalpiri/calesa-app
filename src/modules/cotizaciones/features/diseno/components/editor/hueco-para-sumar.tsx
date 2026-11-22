'use client'

import { useDroppable } from '@dnd-kit/core'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/shared/ui/popover'
import type { OfertaParaSumar, TipoParaSumar } from '../../../../entities/diseno/ofertas-para-sumar'
import { A_TAMANO_REAL } from './marco-escalado'

const RENGLON = 'min-h-11 w-full justify-start text-left whitespace-normal md:min-h-8'

function Tipos({
  ofertas,
  alElegir,
}: {
  ofertas: OfertaParaSumar[]
  alElegir: (o: OfertaParaSumar) => void
}) {
  return (
    <ul className="grid gap-1">
      {ofertas.map((o) => (
        <li key={o.tipo} className="grid gap-0.5">
          <Button
            variant="ghost"
            className={RENGLON}
            disabled={o.motivo !== null}
            onClick={() => {
              alElegir(o)
            }}
          >
            {o.etiqueta}
          </Button>
          {o.motivo === null ? null : (
            <p className="px-2 text-(length:--text-xs) text-(--color-ink-faint)">{o.motivo}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

const DISPARADOR = {
  hueco:
    'flex min-h-[44px] w-full items-center justify-center rounded-(--radius-md) border border-dashed border-(--color-line-strong) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) disabled:opacity-50',
  boton: `${A_TAMANO_REAL} flex size-8 items-center justify-center rounded-full border border-(--color-line-strong) bg-(--color-surface) text-(--color-ink-soft) shadow-(--shadow-sm) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) disabled:opacity-50`,
} as const

type PropsDelMenu = {
  etiqueta: string
  disparador: keyof typeof DISPARADOR
  ofertas: () => OfertaParaSumar[]
  ocupado: boolean
  alSumar: (tipo: TipoParaSumar, nodo: string | null) => void
}

// El «+» del lienzo: abre los tipos de pieza (apagados con su motivo: el tope de 40, la tarjeta del total ya ubicada o una sección que no la admite) y, elegido
// uno, las filas de la fórmula que puede dibujar. La tarjeta del total no elige fila: se suma en el acto.
export function MenuParaSumar({ etiqueta, disparador, ofertas, ocupado, alSumar }: PropsDelMenu) {
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<OfertaParaSumar | null>(null)
  const lista = abierto ? ofertas() : []
  const elegida = tipo === null ? null : (lista.find((o) => o.tipo === tipo.tipo) ?? null)
  const sumar = (t: TipoParaSumar, nodo: string | null) => {
    setAbierto(false)
    setTipo(null)
    alSumar(t, nodo)
  }
  return (
    <Popover
      open={abierto}
      onOpenChange={(abrir) => {
        setAbierto(abrir)
        if (!abrir) setTipo(null)
      }}
    >
      <PopoverTrigger disabled={ocupado} aria-label={etiqueta} className={DISPARADOR[disparador]}>
        <PlusIcon aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-96 w-80 max-w-(--available-width) overflow-y-auto"
      >
        <PopoverTitle>{elegida === null ? 'Sumar una pieza' : elegida.etiqueta}</PopoverTitle>
        {elegida === null ? (
          <Tipos
            ofertas={lista}
            alElegir={(o) => {
              if (o.tipo === 'total') sumar('total', null)
              else setTipo(o)
            }}
          />
        ) : (
          <div className="grid gap-1">
            <Button
              variant="outline"
              className={RENGLON}
              onClick={() => {
                setTipo(null)
              }}
            >
              Volver
            </Button>
            <ul className="grid gap-1">
              {elegida.candidatos.map((c) => (
                <li key={c.nodo}>
                  <Button
                    variant="ghost"
                    className={RENGLON}
                    onClick={() => {
                      sumar(elegida.tipo, c.nodo)
                    }}
                  >
                    {c.etiqueta}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

type Props = Omit<PropsDelMenu, 'etiqueta' | 'disparador'> & {
  // El id del arrastre del final de la sección.
  idDelFin: string
  // Si lo que se arrastra caería aquí.
  destino: boolean
}

export const SUMAR_AQUI = 'Sumar una pieza aquí'

// El final de una sección del lienzo: su «+» («Sumar una pieza aquí») y el lugar donde cae lo que se suelta al final (o en una sección vacía).
export function HuecoParaSumar({ idDelFin, destino, ...menu }: Props) {
  const { setNodeRef } = useDroppable({ id: idDelFin })
  return (
    <div
      ref={setNodeRef}
      data-hueco-para-sumar=""
      data-destino={destino ? '' : undefined}
      className={`col-span-12 min-w-0 rounded-(--radius-md) ${destino ? 'outline-2 outline-(--color-accent)' : ''}`}
    >
      <MenuParaSumar etiqueta={SUMAR_AQUI} disparador="hueco" {...menu} />
    </div>
  )
}
