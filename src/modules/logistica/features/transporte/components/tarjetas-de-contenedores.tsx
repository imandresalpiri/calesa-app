'use client'

import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import type { ContenedorDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import { textoDeFaltan, textoDeVehiculos } from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { AccionesDeLaFilaDelContenedor } from './acciones-de-la-fila'
import { Faltan } from './celdas-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'

type Props = {
  contenedores: readonly ContenedorDeLaLista[]
  origenId: string
  alAbrir: (id: string) => void
  abierto: string | null
}

// Los contenedores de la página en el celular: lo mismo que la fila de la tabla. Un toque abre su drawer.
export function TarjetasDeContenedores({ contenedores, origenId, alAbrir, abierto }: Props) {
  const dia = useDia()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
      {contenedores.map((c) => (
        <TarjetaDeLista
          key={c.id}
          abierta={abierto === c.id}
          alAbrir={() => {
            alAbrir(c.id)
          }}
          acciones={
            <AccionesDeLaFilaDelContenedor
              id={c.id}
              numero={c.numero}
              embarqueId={c.embarque?.id ?? null}
              origenId={origenId}
            />
          }
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`el contenedor ${c.numero}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {c.numero}
            </AbrirResumen>
            <InsigniaDeEstado estado={c.estado} />
          </div>
          <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            {[
              c.tipoNombre,
              c.embarque === null ? null : `Embarque ${c.embarque.booking}`,
              c.etaEl === null ? null : `ETA ${dia(c.etaEl)}`,
            ]
              .filter((t) => t !== null)
              .join(' · ')}
          </p>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {textoDeVehiculos(c.vehiculos, c.hayOcultos)}
          </p>
          {textoDeFaltan(c.faltan) === null ? null : (
            <p className="text-(length:--text-sm)">
              <Faltan faltan={c.faltan} embarqueId={c.embarque?.id ?? null} origenId={origenId} />
            </p>
          )}
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
