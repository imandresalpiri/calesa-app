'use client'

import type { ResultadoDeLaEdicion } from '../../../hooks/use-resultado-al-lado'
import { CeldaDelValor } from '../celda-del-valor'

export const NOMBRE_DEL_RESULTADO = 'Resultado con la unidad de ejemplo'

// La caja del resultado al lado (D12 de la fórmula fácil), entre el texto y «Aplicar»: lo que daría la C que se escribe con la unidad de ejemplo, con los
// decimales de la celda y el Modo Live (`CeldaDelValor`). Está mientras se escribe una C, aunque esté vacía (sin cifra o antes de la pausa), así no aparece ni se
// va al tipear. En un contenedor angosto va en su propio renglón.
export function ResultadoAlLado({ resultado }: { resultado: ResultadoDeLaEdicion }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={NOMBRE_DEL_RESULTADO}
      title={NOMBRE_DEL_RESULTADO}
      data-resultado-al-lado=""
      className="flex min-h-[44px] min-w-[8ch] shrink-0 basis-full items-center justify-end rounded-(--radius-md) bg-(--color-surface-2) px-3 font-mono text-(length:--text-sm) tabular-nums @2xl/formula:basis-auto md:pointer-fine:min-h-9"
    >
      {resultado.cifra === null ? null : <CeldaDelValor cifra={resultado.cifra} leyendo={false} />}
    </div>
  )
}
