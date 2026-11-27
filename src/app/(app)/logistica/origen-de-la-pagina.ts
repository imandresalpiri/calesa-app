import 'server-only'
import { cache } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerOrigenesDeLaCadena } from '@/modules/logistica'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { origenesParaConfigurar } from './enlaces'
import { resolverElOrigen, type OrigenResuelto } from './origen-de-la-cadena'

export type OrigenDeLaPagina = {
  permisos: Permisos
  // `sin_acceso`: la persona no tiene `logistica.ver` en ningún origen (la página dice «sin permiso» y no hay barra).
  resuelto: OrigenResuelto | { tipo: 'sin_acceso' }
  // Los orígenes cuya pestaña Fases abre el ⚙ (`origenesParaConfigurar`); vacío si no configura ninguno o no se pudieron leer.
  paraConfigurar: string[]
}

// El origen de una página de Logística, leído una vez por request: la barra y el contenido (cada uno en su `<Suspense>`) lo piden con el mismo `pedido` (el texto
// de `?origen=` o `undefined`), así `cache()` acierta. La sesión, los orígenes y sus flujos también van en caché. Tras `await connection()`: lee sesión y base.
export const origenDeLaPagina = cache(
  async (pedido: string | undefined): Promise<OrigenDeLaPagina> => {
    const sesion = await requerirSesion()
    const { permisos } = sesion
    if (!puede(permisos, 'logistica.ver')) {
      return { permisos, resuelto: { tipo: 'sin_acceso' }, paraConfigurar: [] }
    }
    const [todos, visibles] = await Promise.all([
      getOrigenes(true),
      leerOrigenesDeLaCadena(permisos),
    ])
    const lista = todos.ok ? todos.data : []
    const resuelto = resolverElOrigen({
      visibles,
      todos: lista,
      conPermiso: lista.filter((o) => puede(permisos, 'logistica.ver', o.id)).map((o) => o.id),
      pedido,
      ultimo: sesion.preferencias.ultimoOrigenDeLogistica,
    })
    return { permisos, resuelto, paraConfigurar: origenesParaConfigurar(permisos, lista) }
  },
)
