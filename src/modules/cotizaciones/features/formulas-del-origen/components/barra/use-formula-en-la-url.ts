'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { CLAVE_DE_LA_FORMULA } from '@/shared/lib/rutas'

// La fórmula que se dibuja, en la URL (`?formula=<id>`): sin ella (o con una que no se abrió) la página dibujó la de trabajo, y la barra la escribe con un
// `replace` superficial (sin ir al servidor). Así la URL se comparte, se recarga y la siguiente pestaña la conserva.
export function useFormulaEnLaUrl(elegidaId: string | null): void {
  const [enLaUrl, escribir] = useQueryState(CLAVE_DE_LA_FORMULA, parseAsString)
  useEffect(() => {
    if (elegidaId !== null && enLaUrl !== elegidaId) {
      void escribir(elegidaId, { history: 'replace', shallow: true, scroll: false })
    }
  }, [elegidaId, enLaUrl, escribir])
}
