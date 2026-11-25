'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeLaEdicionDeLaTabla } from '../../../hoja/components/huecos'

// La edición de una tabla desde la ayuda de la hoja (el hueco `EdicionDeLaTabla`): se pide al montarse un bloque de tabla de la ayuda, nunca con la hoja. Mientras llega
// (y si no llega), la tabla de la hoja tal cual (`quieta`, la arma el núcleo: nada de la tabla viaja en frío con el proveedor). Aparte del `diferidos.tsx` del área: aquél lo carga la configuración.
export const EdicionDeLaTablaEnLaAyudaDiferida = diferido<PropsDeLaEdicionDeLaTabla>(
  () =>
    import('./edicion-de-la-tabla-en-la-ayuda').then((modulo) => modulo.EdicionDeLaTablaEnLaAyuda),
  { aviso: 'aqui', enFrio: ({ quieta }) => quieta },
)
