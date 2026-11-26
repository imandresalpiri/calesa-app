'use client'

import { useCallback, useEffect, useRef } from 'react'
import { versionVigente, type ResultadoDelLienzo } from '../../../../entities/edicion-del-lienzo'

type Trabajo = (version: string) => Promise<ResultadoDelLienzo>

// Una cola para todas las escrituras del lienzo (mover, «Ordenar solo», deshacer, vincular): una a la vez, cada una con la última versión conocida del flujo
// (`versionVigente`: la que devolvió la escritura anterior mientras la página no se relea). Sin esto, un arrastre seguido de un vínculo chocaría (`PT409`)
// contra uno mismo. Quien encola decide qué hacer con el resultado; un rechazo ya lo dijo quien escribe.
export function useEscrituraDelLienzo(leida: string) {
  const leidaRef = useRef(leida)
  const propia = useRef<string | null>(null)
  const cola = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    leidaRef.current = leida
  }, [leida])

  return useCallback((trabajo: Trabajo): Promise<ResultadoDelLienzo> => {
    const hecho = cola.current.then(async () => {
      const resultado = await trabajo(versionVigente(leidaRef.current, propia.current))
      if (resultado.ok && resultado.version !== null) {
        propia.current = versionVigente(resultado.version, propia.current)
      }
      return resultado
    })
    // Un fallo inesperado no traba la cola.
    cola.current = hecho.catch(() => undefined)
    return hecho
  }, [])
}
