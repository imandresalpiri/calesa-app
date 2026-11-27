import type { ComponentType } from 'react'

import type { ClavePermiso } from '@/shared/lib/permisos'

// Los huecos del resumen de un grupo (embarque, contenedor o declaración) y los de la sub-navegación y de Configuración (6.01). Sólo tipos: cada
// área llena los suyos en `pantallas/<área>-grupo.ts`, `<área>-enlace.ts` y `<área>-catalogos.ts`, y `src/app` los une.
// `origenId`: el origen de la pestaña desde la que se abrió (Embarques); un hueco que lleva a otra página de Logística lo conserva. Nulo o ausente: el último que usó la persona.
export type GrupoDeLogistica = {
  tipo: 'embarque' | 'contenedor' | 'declaracion'
  id: string
  origenId?: string | null
}

export type HuecoDelGrupo = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
  regla: string | null
  componente: ComponentType<{ grupo: GrupoDeLogistica }>
}
