'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import { textoDelResto, type UsosDelMes } from '../../../entities/asistente-ia/usos'

// Las personas que más usaron el asistente este mes: hasta 5 filas «Nombre · n» y «y N más» (`null`: no se pudieron leer). Con su alto, como
// `<ListaCorta>`: llegan con la página y nada de esta pantalla las cambia, así que no hay salto que evitar, y el hueco de las seis líneas haría
// desplazar la página a 1440×900 (`e2e/empresa-tarjetas.spec.ts`).
export function UsosDelAsistente({ usos }: { usos: UsosDelMes | null }) {
  const { locale } = useRegional()
  return (
    <div className="text-(length:--text-sm)">
      {usos === null ? (
        <p className="text-(--color-ink-soft)">No se pudieron leer los usos.</p>
      ) : usos.personas.length === 0 ? (
        <p className="text-(--color-ink-soft)">Nadie lo usó este mes.</p>
      ) : (
        <ul aria-label="Usos de este mes" className="grid">
          {usos.personas.map((persona) => (
            // `@xs:justify-end`: como los demás valores de la tarjeta (`@xs:text-end`, que una fila flex no toma).
            <li key={persona.usuarioId} className="flex min-h-6 min-w-0 gap-1.5 @xs:justify-end">
              <span className="min-w-0 truncate text-(--color-ink)">{persona.nombre}</span>
              <span aria-hidden className="text-(--color-ink-faint)">
                ·
              </span>
              <span className="text-(--color-ink-soft) tabular-nums">
                {formatearNumero(persona.usos, { locale, decimales: 0 })}
              </span>
            </li>
          ))}
          {usos.resto ? (
            <li className="min-h-6 text-(--color-ink-soft)">{textoDelResto(usos.resto, locale)}</li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
