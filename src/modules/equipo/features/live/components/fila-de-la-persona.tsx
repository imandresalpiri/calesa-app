'use client'

import { MasAcciones } from '@/shared/ui/lista'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import type { PersonaDelLive } from '../../../entities/live-configuracion'
import { resumenDeLaPersona } from '../../../entities/live-textos'

type Props = {
  persona: PersonaDelLive
  alEditar: (id: string) => void
  alVolverASuRol: (id: string) => void
}

// Una persona de «Ajustes por persona»: su nombre (el correo en el `title`) y qué sigue («Como su rol (Ventas)», «Ajuste propio en 2 campos»). Tocar
// la fila abre sus ajustes; el «⋯» suma «Volver a lo de su rol…» sólo si tiene lo propio. Al 200 % la fila se apila.
export function FilaDeLaPersona({ persona, alEditar, alVolverASuRol }: Props) {
  const editar = () => {
    alEditar(persona.id)
  }
  return (
    <li
      data-persona-del-live={persona.id}
      className="relative min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2)"
    >
      <ToqueDeLaTarjeta etiqueta={`Editar los ajustes de «${persona.nombre}»`} abrir={editar} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="truncate font-medium text-(--color-ink)" title={persona.email}>
            {persona.nombre}
          </span>
          <span className="truncate text-(length:--text-sm) text-(--color-ink-soft)">
            {resumenDeLaPersona(persona)}
          </span>
        </div>
        <div className="relative ms-auto flex items-center">
          <MasAcciones
            nombre={`«${persona.nombre}»`}
            id={`persona-del-live-${persona.id}`}
            acciones={[
              {
                tipo: 'accion',
                clave: 'editar',
                etiqueta: 'Editar sus ajustes…',
                principal: true,
                despuesDeCerrar: true,
                alElegir: editar,
              },
              ...(persona.ajustes === null
                ? []
                : [
                    {
                      tipo: 'accion' as const,
                      clave: 'a-su-rol',
                      etiqueta: 'Volver a lo de su rol…',
                      destructiva: true,
                      despuesDeCerrar: true,
                      alElegir: () => {
                        alVolverASuRol(persona.id)
                      },
                    },
                  ]),
            ]}
          />
        </div>
      </div>
    </li>
  )
}
