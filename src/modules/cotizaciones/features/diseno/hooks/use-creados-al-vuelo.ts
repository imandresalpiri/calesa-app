'use client'

import { useMemo, useState } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { ColorCreado } from '../../../entities/nuevo-color'
import type { TonoDelCatalogo } from '../components/aspecto'

type Args = {
  niveles: readonly NivelDelDiseno[]
  tonos: readonly Tono[]
  catalogo: readonly TonoDelCatalogo[] | null
}

// Los de la página y, detrás, los creados que todavía no trae (por clave, sin repetir).
function conLosCreados<T extends { clave: string }>(
  leidos: readonly T[],
  creados: readonly T[],
): readonly T[] {
  const nuevos = creados.filter((c) => !leidos.some((l) => l.clave === c.clave))
  return nuevos.length === 0 ? leidos : [...leidos, ...nuevos]
}

// Los niveles y colores creados al vuelo desde el inspector («+ Nuevo nivel», «+ Nuevo color»), sumados a los que leyó la página hasta que la página los
// traiga: el editor los valida y los dibuja en el acto. Vive fuera de la `key` del editor (publicar o «Recargar» no los pierde).
export function useCreadosAlVuelo({ niveles, tonos, catalogo }: Args) {
  const [nivelesCreados, setNiveles] = useState<readonly NivelDelDiseno[]>([])
  const [coloresCreados, setColores] = useState<readonly ColorCreado[]>([])
  const todosLosNiveles = useMemo(
    () => conLosCreados(niveles, nivelesCreados),
    [niveles, nivelesCreados],
  )
  const todosLosTonos = useMemo(
    () =>
      conLosCreados(
        tonos,
        coloresCreados.map(({ clave, claro, oscuro }) => ({ clave, claro, oscuro })),
      ),
    [tonos, coloresCreados],
  )
  const todoElCatalogo = useMemo(
    () =>
      catalogo === null
        ? null
        : conLosCreados(
            catalogo,
            coloresCreados.map(({ clave, nombre }) => ({ clave, nombre })),
          ),
    [catalogo, coloresCreados],
  )
  return {
    niveles: todosLosNiveles,
    tonos: todosLosTonos,
    catalogo: todoElCatalogo,
    sumarNivel: (nivel: NivelDelDiseno) => {
      setNiveles((antes) => [...antes, nivel])
    },
    sumarColor: (color: ColorCreado) => {
      setColores((antes) => [...antes, color])
    },
  }
}
