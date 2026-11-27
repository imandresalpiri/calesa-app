import type { Route } from 'next'
import Link from 'next/link'
import { conteoCorto } from '@/shared/lib/conteo'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDelGrupoDeLaBandeja } from '../../../entities/alertas/grupos'
import type { GrupoParaDibujar } from '../../../entities/alertas/estado-de-la-bandeja'
import { ErrorDelGrupo } from './error-del-grupo'
import { FilasDelGrupo } from './filas-del-grupo'

type Props = {
  grupo: GrupoParaDibujar
  permisos: Permisos
  ahora: Date
  zona: string
  origenes: ReadonlyMap<string, string> | null
  // El origen de la bandeja: «Ver todos» lo lleva.
  origenId: string
}

// Un grupo de la bandeja del día de un origen: el título con su cantidad (con tope: «37», «100+»), las primeras filas y «Ver todos». Un grupo que no cargó dice cuál y ofrece «Reintentar».
export function GrupoDeLaBandeja({ grupo, permisos, ahora, zona, origenes, origenId }: Props) {
  if (grupo.estado === 'error') {
    return (
      <section
        aria-label={grupo.titulo}
        className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
      >
        <ErrorDelGrupo titulo={grupo.titulo} />
      </section>
    )
  }
  const { lectura } = grupo
  return (
    <section
      aria-labelledby={`grupo-${grupo.grupo}`}
      data-grupo={grupo.grupo}
      className="grid gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-3 py-2"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3
          id={`grupo-${grupo.grupo}`}
          className="text-(length:--text-sm) font-semibold text-(--color-ink)"
        >
          {grupo.titulo}
          {lectura.conteo ? ' ' : null}
          {lectura.conteo ? (
            <span className="ml-2 font-normal text-(--color-ink-soft) tabular-nums">
              {conteoCorto(lectura.conteo)}
            </span>
          ) : null}
        </h3>
        {lectura.hayMas ? (
          <Link
            href={rutaDelGrupoDeLaBandeja(grupo.grupo, { origenId }) as Route}
            prefetch={false}
            aria-label={`Ver todos: ${grupo.titulo}`}
            className="inline-flex min-h-11 items-center rounded-(--radius-input) text-(length:--text-sm) text-(--color-primario) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-8"
          >
            Ver todos
          </Link>
        ) : null}
      </header>
      <FilasDelGrupo
        filas={lectura.filas}
        permisos={permisos}
        ahora={ahora}
        zona={zona}
        origenes={origenes}
      />
    </section>
  )
}
