'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { ItemDeDiseno } from '../../../../entities/diseno'
import type { CambioDeAspectoDeItem } from '../../../../entities/diseno/edicion-del-aspecto'
import { CamposDeEscala } from './campos-de-escala'
import { camposDeTexto } from './campos-de-texto'
import { CamposDelLugar, type PropsDelLugar } from './campos-del-lugar'

type Props = {
  // El prefijo de los nombres de sus campos (`<sección>__<nodo>`).
  base: string
  item: ItemDeDiseno
  // Su lugar en la rejilla («Columna», «Fila», «Ancho», «Alto»); nulo en la celda, que lo tiene a la vista.
  lugar: PropsDelLugar | null
  ocupado: boolean
  alPoner: (cambios: CambioDeAspectoDeItem) => void
}

// El aspecto de un ítem, a la vista: su lugar en la rejilla de su sección (si no es una celda), su letra y su énfasis.
export function CamposDelAspectoDelItem({ base, item, lugar, ocupado, alPoner }: Props) {
  return (
    <Bloque titulo="Aspecto" className="mt-2">
      <div className="grid min-w-0 gap-2">
        {lugar === null ? null : <CamposDelLugar {...lugar} />}
        <div className="grid min-w-0 gap-2 @md:grid-cols-2">
          <CamposDeEscala base={base} ocupado={ocupado} campos={camposDeTexto(item, alPoner)} />
        </div>
      </div>
    </Bloque>
  )
}
