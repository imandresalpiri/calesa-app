'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DEL_HISTORIAL_DEL_LEAD,
  rotuloDeVehiculo,
  type VinculoCerrado,
} from '../../../entities/vehiculos-del-lead'

type Props = {
  abierto: boolean
  alCerrar: () => void
  historial: readonly VinculoCerrado[]
  hayMas: boolean
}

// «Vínculos anteriores» de un lead (`?panel=vinculos-anteriores`): una línea por vínculo cerrado, sin personas; sólo los de vehículos que quien
// mira ve (la base no entrega los otros). Se ve todo lo leído con la ficha (hasta `TOPE_DEL_HISTORIAL_DEL_LEAD`); `hayMas`: llegó al tope y hay
// más que no se ven, dicho al pie con `<AvisoDeTope>`. Sólo muestra.
export function DrawerDeVinculosAnteriores({ abierto, alCerrar, historial, hayMas }: Props) {
  const { zonaHoraria: zona } = useRegional()
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo="Vínculos anteriores">
      {historial.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Este lead no tiene vínculos anteriores.
        </p>
      ) : (
        <div className="grid min-w-0 gap-3">
          <ul
            aria-label="Vínculos anteriores"
            className="grid grid-cols-[minmax(0,1fr)] gap-2 text-(length:--text-sm)"
          >
            {historial.map((vinculo) => (
              <li key={`${vinculo.vehiculoId}-${vinculo.desde}`} className="grid min-w-0 gap-0.5">
                <Link
                  href={`${RUTAS.vehiculos}/${vinculo.vehiculoId}` as Route}
                  className="w-fit font-medium underline-offset-2 hover:underline"
                >
                  {rotuloDeVehiculo(vinculo)}
                </Link>
                <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                  Vinculado el {formatearFecha(vinculo.desde, { zona })}, desvinculado el{' '}
                  {formatearFecha(vinculo.hasta, { zona })}
                </span>
              </li>
            ))}
          </ul>
          {hayMas ? <AvisoDeTope texto={textoDelTope(TOPE_DEL_HISTORIAL_DEL_LEAD)} /> : null}
        </div>
      )}
    </Drawer>
  )
}
