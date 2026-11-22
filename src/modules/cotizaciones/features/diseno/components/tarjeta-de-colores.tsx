'use client'

import { MuestraDeColor, TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import { COLORES_EN_LA_TARJETA, resumirColores } from '../../../entities/diseno/panel-de-tonos'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'
import { useFamiliaDeColores } from '../hooks/use-familia-de-colores'
import { ColoresDelCatalogoDiferido } from './diferidos'

// La tarjeta «Colores» de Configuración › Orígenes: los primeros colores por nombre (hasta `COLORES_EN_LA_TARJETA`) y «y N más» sobre lo leído. Tocarla, o «Editar colores…» del «⋯»,
// abre la lista en su modal (`?panel=colores`); «Nuevo color» sale de ella. La lista se pide recién al abrir algún panel de la familia (`useFamiliaDeColores().montar`).
export function TarjetaDeColores({ lista }: { lista: ListaDeTonos }) {
  const familia = useFamiliaDeColores()
  const { visibles, mas } = resumirColores(lista.tonos, COLORES_EN_LA_TARJETA)
  return (
    <>
      <TarjetaTocable titulo="Colores" accion="Editar colores" motivo={null} abrir={familia.abrir}>
        {visibles.length === 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            Todavía no hay colores.
          </p>
        ) : (
          <div className="grid gap-2">
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
              {visibles.map((tono) => (
                <li
                  key={tono.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-(length:--text-sm) text-(--color-ink)"
                >
                  <span className="min-w-0 break-words">{tono.nombre}</span>
                  <span className="text-(--color-ink-soft)">
                    <MuestraDeColor color={tono.hex} />
                  </span>
                </li>
              ))}
            </ul>
            {mas > 0 ? (
              <p className="text-(length:--text-xs) text-(--color-ink-faint)">y {mas} más</p>
            ) : null}
          </div>
        )}
      </TarjetaTocable>
      {familia.montar ? <ColoresDelCatalogoDiferido lista={lista} /> : null}
    </>
  )
}
