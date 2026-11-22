'use client'

import { Badge } from '@/shared/ui/badge'
import {
  textoDelEstado,
  tonoDelEstado,
  type TonoDelEstado,
} from '../../../../entities/estado-de-la-edicion'
import type { FormulaDeLaLista } from '../../../../entities/formulas-del-origen/lista'
import { useContextoDeLaBarra } from '../../../barra-de-la-formula/components'
import { EstadoDeLaFormula } from '../estado-de-la-formula'

const VARIANTE: Record<TonoDelEstado, 'default' | 'secondary' | 'outline'> = {
  aviso: 'outline',
  neutro: 'secondary',
  exito: 'default',
}

// El estado en la barra de la fórmula, con texto (nunca sólo color): el que dice el editor de la pestaña (Cambios sin guardar · Borrador · Publicada vN) o, si
// no dice ninguno, el de la fórmula elegida (Activa · Publicada · Borrador · Archivada). Se anuncia al cambiar.
export function EstadoEnLaBarra({ elegida }: { elegida: FormulaDeLaLista | null }) {
  const estado = useContextoDeLaBarra()?.estado ?? null
  return (
    <div aria-live="polite" className="flex min-w-0 flex-wrap items-center gap-2">
      {estado ? (
        <>
          <Badge variant={VARIANTE[tonoDelEstado(estado)]} data-estado-de-la-edicion={estado.tipo}>
            {textoDelEstado(estado)}
          </Badge>
          {estado.tipo !== 'cambios' && estado.detalle ? (
            <span className="hidden text-(length:--text-sm) text-(--color-ink-soft) md:inline">
              {estado.detalle}
            </span>
          ) : null}
        </>
      ) : elegida ? (
        <EstadoDeLaFormula formula={elegida} />
      ) : null}
    </div>
  )
}
