'use client'

import { useId } from 'react'
import { idDeCasilla } from '@/shared/lib/campos'
import type { AccionDeCasilla, Envoltorios } from './cuerpo'
import type { CasillasDelEditor } from './tipos'

type Props = {
  casillas: CasillasDelEditor
  puedeGestionar: boolean
  envoltorios: Envoltorios
  alElegir: (posicion: number, accion: AccionDeCasilla) => void
}

// Las casillas de dato clave: el tope de lugares, en orden, los llenos primero y después los libres. Arriba de todo el editor.
export function Casillas({ casillas, puedeGestionar, envoltorios, alElegir }: Props) {
  const titulo = useId()
  const { Lista, Casilla, Libre } = envoltorios
  const { lista, tope } = casillas
  const libres = Array.from(
    { length: Math.max(0, tope - lista.length) },
    (_, i) => lista.length + i,
  )
  return (
    <section aria-labelledby={titulo} className="grid gap-2">
      <h2 id={titulo} className="text-(length:--text-base) font-medium text-(--color-ink)">
        {casillas.titulo} ({lista.length} de {tope})
      </h2>
      {lista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{casillas.vacio}</p>
      ) : null}
      <Lista id="casillas" ids={lista.map((casilla) => idDeCasilla(casilla.llave))}>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 @min-[36rem]/campos:grid-cols-2 @min-[56rem]/campos:grid-cols-4">
          {lista.map((casilla, posicion) => (
            <Casilla
              key={casilla.llave}
              casilla={casilla}
              posicion={posicion}
              total={lista.length}
              quitar={casillas.quitar}
              zona={casillas.zona}
              puedeGestionar={puedeGestionar}
              alElegir={alElegir}
            />
          ))}
          {libres.map((posicion) => (
            <Libre key={`libre-${String(posicion)}`} posicion={posicion} zona={casillas.zona} />
          ))}
        </ol>
      </Lista>
      {lista.length >= tope ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{casillas.motivoTope}</p>
      ) : null}
    </section>
  )
}
