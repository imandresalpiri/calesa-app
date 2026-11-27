'use client'

import Link from 'next/link'
import { consultaDelDrawerDeLasTablas, rutaDeLaFormula } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import type { AvisosDeLaCopia } from '../../hooks/use-avisos-de-la-copia'
import { SECCION, TITULO } from './clases'

type Props = { origenId: string; formulaDelOrigenId: string; avisos: AvisosDeLaCopia }

// Los avisos de la copia (docs/GLOSARIO.md) de una fórmula recién copiada de otro origen, en el modal «Información de la fórmula» (que abre solo tras copiar con
// avisos). Los de tablas abren el drawer «Tablas» sobre la planilla de esa fórmula; «Ocultar» los borra. Los datos del vehículo que faltan quedan además marcados
// en sus filas (`useCamposDeLaFormula()`).
export function SeccionDeLosAvisos({ origenId, formulaDelOrigenId, avisos }: Props) {
  const conTablas = avisos.textos.some((t) => t.tablas)
  return (
    <section
      aria-label="Lo que cambió al copiar la fórmula"
      data-avisos-de-la-copia=""
      className={SECCION}
    >
      <h3 className={TITULO}>Lo que cambió al copiar la fórmula</h3>
      <ul className="grid list-disc gap-1 pl-5 text-(--color-ink)">
        {avisos.textos.map((t) => (
          <li key={t.clave} className="break-words">
            {t.texto}
          </li>
        ))}
      </ul>
      <div className="mt-1 flex flex-wrap gap-2">
        {conTablas ? (
          <Link
            href={rutaDeLaFormula(
              origenId,
              formulaDelOrigenId,
              'planilla',
              consultaDelDrawerDeLasTablas(),
            )}
            className="inline-flex min-h-11 items-center underline md:min-h-9"
          >
            Abrir Tablas
          </Link>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={avisos.ocultar}
        >
          Ocultar
        </Button>
      </div>
    </section>
  )
}
