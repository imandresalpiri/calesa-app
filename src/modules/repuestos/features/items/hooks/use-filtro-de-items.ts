'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback, useMemo } from 'react'
import {
  CLAVES_DEL_FILTRO,
  leerFiltroDeItems,
  type FiltroDeItems,
} from '../../../entities/items/filtro'

const PARSERS = {
  [CLAVES_DEL_FILTRO.q]: parseAsString,
  [CLAVES_DEL_FILTRO.fase]: parseAsString,
  [CLAVES_DEL_FILTRO.tipo]: parseAsString,
  [CLAVES_DEL_FILTRO.condicion]: parseAsString,
  [CLAVES_DEL_FILTRO.pais]: parseAsString,
  [CLAVES_DEL_FILTRO.via]: parseAsString,
  [CLAVES_DEL_FILTRO.sinPrecio]: parseAsString,
}

export type ParteDelFiltro = Exclude<keyof FiltroDeItems, 'sinPrecio'>

// El buscador y los filtros de los ítems en la URL (`?q=&fase=&tipo=&condicion=&pais=&via=&sin_precio=1`). Se filtra en el navegador sobre las filas que la hoja ya leyó, así que **no** va al
// servidor (`shallow: true`, `history: 'replace'`: tipear no llena el historial ni vuelve a leer la página). Lo inválido de la URL no filtra (`leerFiltroDeItems`).
export function useFiltroDeItems() {
  const [valores, escribir] = useQueryStates(PARSERS, { shallow: true, history: 'replace' })
  const filtro = useMemo(() => leerFiltroDeItems(valores), [valores])
  const cambiar = useCallback(
    (parte: ParteDelFiltro, valor: string | null) => {
      void escribir({ [CLAVES_DEL_FILTRO[parte]]: valor === '' ? null : valor })
    },
    [escribir],
  )
  const alternarSinPrecio = useCallback(() => {
    void escribir((previos) => ({
      [CLAVES_DEL_FILTRO.sinPrecio]: previos[CLAVES_DEL_FILTRO.sinPrecio] === '1' ? null : '1',
    }))
  }, [escribir])
  const limpiar = useCallback(() => {
    void escribir({
      [CLAVES_DEL_FILTRO.q]: null,
      [CLAVES_DEL_FILTRO.fase]: null,
      [CLAVES_DEL_FILTRO.tipo]: null,
      [CLAVES_DEL_FILTRO.condicion]: null,
      [CLAVES_DEL_FILTRO.pais]: null,
      [CLAVES_DEL_FILTRO.via]: null,
      [CLAVES_DEL_FILTRO.sinPrecio]: null,
    })
  }, [escribir])
  return { filtro, cambiar, alternarSinPrecio, limpiar }
}
