'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { diasEnLaFase } from '../../../entities/nucleo/dias-en-la-fase'
import type { ResultadoDeDondeEsta, UnidadDondeEsta } from '../../../entities/cadena/leer'
import { EnlaceALaUnidad } from '../../nucleo/components/enlace-a-la-unidad'

type Props = {
  // Lo que encontró «dónde está» para la búsqueda (en el origen elegido o en todos), o `null` si no se pudo comprobar.
  resultado: ResultadoDeDondeEsta | null
  ahora: Date
  // Buscando en todos los orígenes: el nombre de cada uno, para decir de cuál es cada vehículo. Nulo en un origen.
  origenes: ReadonlyMap<string, string> | null
}

function cuantoHace(faseDesde: string | null, ahora: Date): string | null {
  const dias = diasEnLaFase(faseDesde, ahora)
  if (dias === null) return null
  if (dias === 0) return 'desde hoy'
  return `hace ${String(dias)} ${dias === 1 ? 'día' : 'días'}`
}

// «en «<fase>» hace 3 días · ETA <fecha>»: la fase es la que la base dice; sin fase, «Sin fase». El nombre va aparte, como enlace a la página del vehículo.
function Detalle({ unidad, ahora }: { unidad: UnidadDondeEsta; ahora: Date }) {
  const { zonaHoraria } = useRegional()
  const hace = cuantoHace(unidad.faseDesde, ahora)
  const partes = [
    unidad.faseId === null || unidad.faseNombre === null
      ? 'Sin fase'
      : `en «${unidad.faseNombre}»${hace ? ` ${hace}` : ''}`,
    unidad.etaEl ? `ETA ${formatearFecha(unidad.etaEl, { zona: zonaHoraria })}` : null,
  ].filter((parte) => parte !== null)
  return <>{partes.join(' · ')}</>
}

function cuantas(n: number): string {
  return n === 1 ? 'Encontré 1 vehículo.' : `Encontré ${String(n)} vehículos.`
}

// Bajo el buscador, cuando se busca: dónde está cada unidad que coincide, del origen elegido o, buscando en todos, con su origen. El nombre lleva a la página del
// vehículo. No se dibuja con una búsqueda corta; si no se pudo comprobar, lo dice sin tumbar la Cadena.
export function FranjaDeDondeEsta({ resultado, ahora, origenes }: Props) {
  if (resultado === null) {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        No se pudo comprobar dónde está.
      </p>
    )
  }
  return (
    <section
      aria-label="Resultado de dónde está"
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <p role="status" className="sr-only">
        {resultado.unidades.length === 0
          ? 'Ningún vehículo coincide.'
          : cuantas(resultado.unidades.length)}
      </p>
      {resultado.unidades.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Ningún vehículo coincide.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
          {resultado.unidades.map((unidad) => (
            <li
              key={unidad.id}
              className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-2 text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8"
            >
              <EnlaceALaUnidad id={unidad.id} nombre={unidad.titulo} />
              <span>
                {origenes !== null ? `· ${origenes.get(unidad.origenId) ?? 'Otro origen'} ` : null}·{' '}
                <Detalle unidad={unidad} ahora={ahora} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {resultado.hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay más: escribe más para afinar.
        </p>
      ) : null}
    </section>
  )
}
