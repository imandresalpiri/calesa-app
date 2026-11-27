'use client'

import { ArrowRightIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { GrupoDePar, TipoCambio } from '../../../entities/tipos-cambio'
import type { UltimoCambio } from '../../../entities/tipos-cambio-vigentes'
import { TarjetaDeTipoCambio } from './tarjeta-de-tipo-cambio'

type Props = {
  grupo: GrupoDePar
  // Todos los tipos de cambio, de todos los pares: el tope de la barra los cuenta juntos.
  tipos: readonly TipoCambio[]
  ultimosCambios: Readonly<Record<string, UltimoCambio>>
  puedeGestionar: boolean
  // Quien gestiona y hay al menos dos monedas activas: sin ellas el panel de crear no tiene entre qué elegir.
  puedeSumar: boolean
  enCurso: boolean
  alAbrir: (id: string) => void
  alCrear: (par: GrupoDePar) => void
  alUsarPorDefecto: (tipo: TipoCambio) => void
  alCambiarEnLaBarra: (tipo: TipoCambio, enLaBarra: boolean) => void
}

// Un par de monedas (USD → BOB), un grupo (no una sección: las tarjetas son las secciones) con sus tipos de cambio como tarjetas y «+ Tipo de cambio» para sumar otro entre las mismas dos.
export function GrupoDePar(props: Props) {
  const { grupo, tipos, ultimosCambios, puedeGestionar, puedeSumar, enCurso } = props
  const titulo = `grupo-${grupo.clave}`
  return (
    <div role="group" aria-labelledby={titulo} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={titulo}
          className="flex items-center gap-2 text-(length:--text-lg) font-medium text-(--color-ink)"
        >
          {grupo.monedaDe}
          <ArrowRightIcon aria-label="a" className="size-4 text-(--color-ink-faint)" />
          {grupo.monedaA}
        </h2>
        {puedeSumar ? (
          <Button
            variant="outline"
            className="h-auto min-h-11 max-w-full text-left whitespace-normal md:min-h-8"
            aria-label={`Nuevo tipo de cambio de ${grupo.monedaDe} a ${grupo.monedaA}`}
            onClick={() => {
              props.alCrear(grupo)
            }}
          >
            <PlusIcon aria-hidden />
            Tipo de cambio
          </Button>
        ) : null}
      </div>
      <TarjetasDeAjustes etiqueta={`Tipos de cambio de ${grupo.monedaDe} a ${grupo.monedaA}`}>
        {grupo.tipos.map((tipo) => (
          <TarjetaDeTipoCambio
            key={tipo.id}
            tipo={tipo}
            tipos={tipos}
            ultimoCambio={ultimosCambios[tipo.id]}
            puedeGestionar={puedeGestionar}
            enCurso={enCurso}
            alAbrir={() => {
              props.alAbrir(tipo.id)
            }}
            alUsarPorDefecto={() => {
              props.alUsarPorDefecto(tipo)
            }}
            alCambiarEnLaBarra={(enLaBarra) => {
              props.alCambiarEnLaBarra(tipo, enLaBarra)
            }}
          />
        ))}
      </TarjetasDeAjustes>
    </div>
  )
}
