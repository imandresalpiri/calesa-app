'use client'

import type { DiaDeActividad } from '../../../entities/filtros'
import { FilaDeActividad } from './fila-de-actividad'

type Props = {
  dias: readonly DiaDeActividad[]
  zona: string
  idAbierto: number | null
  abrir: (id: number) => void
}

// La actividad por día en la zona de la empresa: un título por día y sus cambios como frases, una sola presentación en todo ancho.
export function ListaDeActividad({ dias, zona, idAbierto, abrir }: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {dias.map((dia) => (
        <section key={dia.dia} aria-labelledby={`dia-${dia.dia}`} className="grid min-w-0 gap-1.5">
          <h2
            id={`dia-${dia.dia}`}
            className="px-1 text-(length:--text-sm) font-medium text-(--color-ink-soft)"
          >
            {dia.titulo}
          </h2>
          <ol className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
            {dia.filas.map((fila) => (
              <FilaDeActividad
                key={fila.id}
                fila={fila}
                zona={zona}
                abierta={fila.id === idAbierto}
                abrir={abrir}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
