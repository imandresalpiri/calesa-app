import type { Route } from 'next'
import Link from 'next/link'
import { claveDeFase, rutaDeLaFase } from '../../../entities/cadena/fase'
import {
  cifraDeLaFase,
  etiquetaDeLaFase,
  nombreDeLaFase,
  textoDeDemorados,
  textoDeTrabados,
  type FaseDelResumen,
} from '../../../entities/cadena/resumen'
import { BarraDeLaFase } from './barra-de-la-fase'

type Props = {
  fase: FaseDelResumen
  origenId: string
  maximo: number
  // El Modo Live con «Sólo la cadena»: la fase se ve igual, sin llevar a su lista.
  sinEnlace?: boolean
}

const CAJA = 'grid min-h-11 gap-1.5 rounded-(--radius-card) px-2 py-2.5'

// Una fase en la línea de la cadena: un punto sobre el riel con su color, el nombre, la cifra a la derecha, la barra y, en texto, cuántos están demorados y trabados (nunca sólo color).
// Es un enlace a la lista de la fase (con `sinEnlace`, la misma caja sin enlace). Una fase jubilada que aún tiene vehículos lo dice con «Jubilada».
export function FaseDeLaGrafica({ fase, origenId, maximo, sinEnlace = false }: Props) {
  return (
    <li className="relative pl-7 before:absolute before:top-0 before:bottom-0 before:left-[0.4375rem] before:w-px before:bg-(--color-line-strong) first:before:top-4 last:before:bottom-auto last:before:h-4">
      <span
        aria-hidden
        className="absolute top-4 left-0 size-3.5 rounded-full border-2 border-(--color-surface)"
        style={{ backgroundColor: fase.color ?? 'var(--viz-series-1)' }}
      />
      {sinEnlace ? (
        <div data-fase={claveDeFase(fase.faseId)} className={CAJA}>
          <ContenidoDeLaFase fase={fase} maximo={maximo} />
        </div>
      ) : (
        <Link
          href={rutaDeLaFase(origenId, claveDeFase(fase.faseId)) as Route}
          prefetch={false}
          aria-label={etiquetaDeLaFase(fase)}
          data-fase={claveDeFase(fase.faseId)}
          className={`${CAJA} outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus)`}
        >
          <ContenidoDeLaFase fase={fase} maximo={maximo} />
        </Link>
      )}
    </li>
  )
}

function ContenidoDeLaFase({ fase, maximo }: Pick<Props, 'fase' | 'maximo'>) {
  const texto = [textoDeDemorados(fase.demorados), textoDeTrabados(fase.trabados)].filter(
    (parte) => parte !== null,
  )
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-(length:--text-sm) font-medium break-words text-(--color-ink)">
          {nombreDeLaFase(fase)}
          {fase.activa === false ? (
            <span className="ml-2 text-(length:--text-xs) font-normal text-(--color-ink-soft)">
              Jubilada
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-2xl font-semibold text-(--color-ink) tabular-nums">
          {cifraDeLaFase(fase)}
        </span>
      </span>
      <BarraDeLaFase fase={fase} maximo={maximo} />
      {texto.length > 0 ? (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">{texto.join(' · ')}</span>
      ) : null}
    </>
  )
}
