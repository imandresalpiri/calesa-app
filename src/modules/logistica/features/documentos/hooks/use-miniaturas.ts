'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { urlsDeLasMiniaturas } from '../../../areas/documentos/composicion.client'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { rutasDeLasMiniaturas } from '../../../entities/documentos/vista-previa'

export type Miniaturas = {
  // La URL firmada de la imagen de esa ruta, o `null` si no hay (todavía, o no se pudo): la fila dice su icono.
  url: (ruta: string) => string | null
  // Pide otra URL de esa ruta (la anterior venció). Una sola vez por ruta: si vuelve a fallar, queda el icono.
  renovar: (ruta: string) => Promise<boolean>
}

// Las miniaturas de una lista de documentos: las URL firmadas de **todas** las imágenes livianas, en una sola llamada, recién cuando la lista se dibuja (nunca una por fila). Una relectura
// de la lista con las mismas rutas no vuelve a pedir nada; una ruta nueva se pide sola, junto con las que lleguen en ese momento. Un fallo deja iconos y la lista se ve igual.
export function useMiniaturas(documentos: readonly DocumentoDeLaUnidad[] | null): Miniaturas {
  const [urls, setUrls] = useState<Readonly<Record<string, string>>>({})
  const pedidas = useRef(new Set<string>())
  const renovadas = useRef(new Set<string>())
  const montado = useRef(true)
  const rutas = useMemo(() => rutasDeLasMiniaturas(documentos ?? []), [documentos])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    const faltan = rutas.filter((ruta) => !pedidas.current.has(ruta))
    if (faltan.length === 0) return
    for (const ruta of faltan) pedidas.current.add(ruta)
    void urlsDeLasMiniaturas(faltan)
      .then((resultado) => {
        if (!resultado.ok) {
          // Sin red o sin permiso: iconos; la próxima ruta nueva (o recargar) vuelve a intentar.
          for (const ruta of faltan) pedidas.current.delete(ruta)
          return
        }
        if (montado.current) setUrls((antes) => ({ ...antes, ...resultado.data }))
      })
      .catch(() => {
        for (const ruta of faltan) pedidas.current.delete(ruta)
      })
  }, [rutas])

  const renovar = useCallback(async (ruta: string): Promise<boolean> => {
    if (renovadas.current.has(ruta)) return false
    renovadas.current.add(ruta)
    const resultado = await urlsDeLasMiniaturas([ruta]).catch(() => null)
    const url = resultado?.ok ? resultado.data[ruta] : undefined
    if (url === undefined || !montado.current) return false
    setUrls((antes) => ({ ...antes, [ruta]: url }))
    return true
  }, [])

  return useMemo(() => ({ url: (ruta) => urls[ruta] ?? null, renovar }), [urls, renovar])
}
