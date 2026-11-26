'use client'

import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { leerPersonasParaTarea } from '../../../composicion.client'
import type { PersonaElegida } from '../../../entities/edicion'
import { SelectorDePersonas } from '../../personas/components/selector-de-personas'

type Props = {
  enCurso: boolean
  // Lo que dijo la base junto al selector (`hint responsable_id`): quien no puede recibir, no es miembro del chat…
  error?: string
  alReasignar: (persona: PersonaElegida) => void
}

// «Cambiar de responsable»: una sección a la vista en el panel de la tarea, con el selector de una persona y «Reasignar» (sin desplegar
// nada: el panel no cambia de alto al usarla). La base decide quién puede recibir; aquí sólo se busca y se pide. El panel la monta con
// `key` = la versión de la tarea: lo elegido se limpia al reasignar.
export function ReasignarTarea({ enCurso, error, alReasignar }: Props) {
  const titulo = useId()
  const [elegida, setElegida] = useState<PersonaElegida | null>(null)
  return (
    <section aria-labelledby={titulo} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <h3 id={titulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        Cambiar de responsable
      </h3>
      <SelectorDePersonas
        etiqueta="Nuevo responsable"
        elegidas={elegida ? [elegida] : []}
        alCambiar={(personas) => {
          setElegida(personas[0] ?? null)
        }}
        leer={leerPersonasParaTarea}
        error={error}
      />
      <div>
        <Button
          className="min-h-11 md:min-h-9"
          disabled={!elegida || enCurso}
          onClick={() => {
            if (elegida) {
              alReasignar(elegida)
            }
          }}
        >
          Reasignar
        </Button>
      </div>
    </section>
  )
}
