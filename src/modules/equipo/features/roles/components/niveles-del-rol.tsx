'use client'

import type { Permisos } from '@/shared/lib/permisos'
import type { NivelDeLaMatriz, OrigenDeLaMatriz } from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import type { ColumnaDeRol } from './grupo-matriz'
import type { HuecosDeNivelesEnLaMatriz } from './huecos-de-niveles'
import { InsigniaDeRetirado } from './insignia-de-retirado'
import { TITULO_DE_LOS_NIVELES } from './niveles-del-grupo'
import { RenglonDelRol } from './renglon-del-rol'

type Props = {
  niveles: readonly NivelDeLaMatriz[]
  huecos: HuecosDeNivelesEnLaMatriz | undefined
  columna: ColumnaDeRol
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  alAplicar: (cambio: CambioDeConcesion) => void
}

// Los niveles de acceso en la lista de un rol (celular): un `h3` y, debajo, «Todos», las dos filas de cada nivel con su «⋯» en la primera, y «+ Nuevo nivel».
export function NivelesDelRol({ niveles, huecos, ...resto }: Props) {
  return (
    <>
      <h3 className="border-t border-(--color-line) px-4 py-2 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)">
        {TITULO_DE_LOS_NIVELES}
      </h3>
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {huecos ? (
          <li className="min-w-0 border-t border-(--color-line) px-4 py-3">{huecos.cabeza}</li>
        ) : null}
        {niveles.map((nivel) =>
          nivel.permisos.map((permiso, indice) => (
            <RenglonDelRol
              key={permiso.clave}
              permiso={permiso}
              {...resto}
              apagado={nivel.retirado}
              adorno={nivel.retirado ? <InsigniaDeRetirado /> : undefined}
              acciones={indice === 0 ? huecos?.menuDelNivel(nivel.clave) : undefined}
            />
          )),
        )}
        {huecos?.pie ? (
          <li className="min-w-0 border-t border-(--color-line) px-4 py-3">{huecos.pie}</li>
        ) : null}
      </ul>
    </>
  )
}
