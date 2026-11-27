'use client'

import { useState } from 'react'
import type { CampoDelLive, OrigenesDelLive } from '../../../entities/live'
import {
  conElOrigen,
  conLaOpcion,
  leerFormulario,
  type FormularioDelLive,
} from '../../../entities/live-formulario'

// Lo elegido en un modal de Configuración › Modo Live (el del rol o el de la persona) y lo que se guardaría. `heredado` son los orígenes que
// mostraban las casillas antes de pasar a «Sólo estos»; `activos`, los que se marcan al pasar desde «Todos».
export function useFormularioDelLive(
  inicial: () => FormularioDelLive,
  { heredado, activos }: { heredado: OrigenesDelLive; activos: readonly string[] },
) {
  const [formulario, setFormulario] = useState(inicial)
  return {
    eleccion: formulario,
    lectura: leerFormulario(formulario),
    elegir: (campo: CampoDelLive, opcion: string) => {
      setFormulario((antes) => conLaOpcion(antes, campo, opcion, { heredado, activos }))
    },
    marcarOrigen: (id: string, marcado: boolean) => {
      setFormulario((antes) => conElOrigen(antes, id, marcado))
    },
  }
}
