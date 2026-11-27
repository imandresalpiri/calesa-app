'use client'

import type { ReactNode } from 'react'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import { EnlaceDeLaFila, TarjetaDeLista } from '@/shared/ui/lista'
import type { EmbarqueDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import { nombreDeCatalogo, textoDeLaRuta } from '../../../entities/transporte/opciones-del-embarque'
import {
  CONTENEDORES,
  textoDeConteo,
  textoDeFaltan,
  textoDeLaLlegada,
  textoDelZarpe,
  textoDeVehiculos,
  tituloDelEmbarque,
} from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { AccionesDeLaFilaDelEmbarque } from './acciones-de-la-fila'
import { Faltan, Valor } from './celdas-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'
import type { PropsDeLaFila } from './tipos-de-la-lista'

type Props = PropsDeLaFila & { embarques: readonly EmbarqueDeLaLista[] }

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-1">
      <dt className="text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

// Los embarques de la página en el celular (y en escritorio con «Tarjetas»): lo mismo que la fila de la tabla. Un toque lleva a la página del embarque.
export function TarjetasDeEmbarques({ embarques, catalogos, origenId, puedeEditar }: Props) {
  const dia = useDia()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
      {embarques.map((e) => {
        const href = embarqueDeLogistica(e.id, origenId)
        return (
          <TarjetaDeLista
            key={e.id}
            href={href}
            acciones={
              <AccionesDeLaFilaDelEmbarque
                id={e.id}
                booking={e.booking}
                origenId={origenId}
                puedeEditar={puedeEditar}
              />
            }
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <EnlaceDeLaFila
                href={href}
                nombre={tituloDelEmbarque(e.booking)}
                className="inline-flex min-h-11 min-w-0 items-center font-medium break-words text-(--color-ink) md:min-h-0"
              >
                {e.booking}
              </EnlaceDeLaFila>
              <InsigniaDeEstado estado={e.estado} />
            </div>
            <dl className="grid gap-0.5 text-(length:--text-sm)">
              <Dato etiqueta="Naviera">
                <Valor texto={nombreDeCatalogo(catalogos.navieras, e.navieraId)} />
              </Dato>
              <Dato etiqueta="Ruta">
                <Valor
                  texto={textoDeLaRuta(
                    nombreDeCatalogo(catalogos.puertos, e.puertoOrigenId),
                    nombreDeCatalogo(catalogos.puertos, e.puertoDestinoId),
                  )}
                />
              </Dato>
              <Dato etiqueta="Zarpe">
                <Valor texto={textoDelZarpe(e, dia)} />
              </Dato>
              <Dato etiqueta="Llegada">
                <Valor texto={textoDeLaLlegada(e, dia)} />
              </Dato>
            </dl>
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              {textoDeConteo(e.contenedores, CONTENEDORES)} ·{' '}
              {textoDeVehiculos(e.vehiculos, e.hayOcultos)}
            </p>
            {textoDeFaltan(e.faltan) === null ? null : (
              <p className="text-(length:--text-sm)">
                <Faltan faltan={e.faltan} embarqueId={e.id} origenId={origenId} />
              </p>
            )}
          </TarjetaDeLista>
        )
      })}
    </ul>
  )
}
