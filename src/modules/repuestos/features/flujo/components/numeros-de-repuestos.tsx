import { conteoCorto } from '@/shared/lib/conteo'
import { EstadoVacio } from '@/shared/ui/estados'
import type { NumerosDeLaFase } from '../../../entities/flujo/numeros'

// `/repuestos` con el Modo Live en «Sólo estadísticas» (glosario: «Modo Live»): una tarjeta por fase del flujo con «Ítems» y «Proyectos», sin descripciones,
// enlaces ni acciones. Server Component: no viaja JS. Cada número es «500+» pasado el tope (`TOPE_DE_LOS_NUMEROS`).

function NombreDeLaFase({ fase }: { fase: NumerosDeLaFase }) {
  return (
    <h2 className="flex min-w-0 items-center gap-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
      {fase.color ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: fase.color }}
        />
      ) : null}
      <span className="truncate">{fase.nombre ?? 'Sin fase'}</span>
    </h2>
  )
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="text-(length:--text-xl) font-semibold text-(--color-ink) tabular-nums">
        {valor}
      </dd>
    </div>
  )
}

export function NumerosDeRepuestos({ fases }: { fases: readonly NumerosDeLaFase[] }) {
  if (fases.length === 0) {
    return <EstadoVacio compacto titulo="El flujo de repuestos todavía no tiene fases." />
  }
  return (
    <ul
      aria-label="Repuestos por fase"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {fases.map((fase) => (
        <li
          key={fase.faseId ?? 'sin-fase'}
          data-fase-de-repuestos=""
          className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
        >
          <NombreDeLaFase fase={fase} />
          <dl className="grid grid-cols-2 gap-3">
            <Cifra etiqueta="Ítems" valor={conteoCorto(fase.items)} />
            <Cifra etiqueta="Proyectos" valor={conteoCorto(fase.proyectos)} />
          </dl>
        </li>
      ))}
    </ul>
  )
}
