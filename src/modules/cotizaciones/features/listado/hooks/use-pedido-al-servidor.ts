'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { CLAVE_DE_RESUMEN_DE_COTIZACION } from '../../../entities/listado/resumen-del-listado'

// El pedido al servidor de lo que la página no trajo (la cotización de `?cotizacion=` que no está en ella y que el servidor no leyó): vuelve a dibujar la página con la URL
// de ahora. Con `necesita` se hace **una vez por id** (`yaPedido`: se pidió, terminó y sigue sin llegar) y otra por cada «Reintentar» (`pedir()`). `pendiente` dice que el
// pedido está en camino: mientras tanto el resumen espera, no dice «error». Cuesta lo que una carga del listado (`docs/RENDIMIENTO.md`).
// Se pide por nuqs (la misma clave con `shallow: false`), no con `router.refresh()`: nuqs escribe la URL un tick después de abrir el resumen, y un refresco pedido antes
// iría sin `?cotizacion=` (abrir una línea del modal de un grupo diría «error»). Así sale en la misma escritura, con la URL ya puesta; el pedido cuenta desde que sale.
export function usePedidoAlServidor(id: string | null, necesita: boolean) {
  const [pendiente, empezar] = useTransition()
  const [, escribir] = useQueryState(CLAVE_DE_RESUMEN_DE_COTIZACION, parseAsString)
  // Lo último que se pidió: el estado (dentro de la transición) para dibujar, y la marca para que el efecto no pida dos veces lo mismo.
  const [pedido, setPedido] = useState<string | null>(null)
  const enviado = useRef<string | null>(null)
  const pedir = useCallback(() => {
    if (id === null) {
      return
    }
    enviado.current = id
    void escribir((actual) => actual, {
      shallow: false,
      startTransition: (salir) => {
        empezar(() => {
          setPedido(id)
          void salir()
        })
      },
    })
  }, [id, empezar, escribir])
  useEffect(() => {
    if (necesita && id !== null && enviado.current !== id) {
      pedir()
    }
  }, [necesita, id, pedir])
  return { pendiente, yaPedido: id !== null && pedido === id && !pendiente, pedir }
}
