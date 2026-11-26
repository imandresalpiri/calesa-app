'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_EDICION_DEL_ITEM, CLAVE_DE_SECCION_DEL_ITEM } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_DESTINO_DEL_PANEL,
  CLAVE_DE_ITEM_DEL_PANEL,
} from '../../../entities/flujo/paneles'

export type ItemPorUrl = ReturnType<typeof useItemPorUrl>

const PARSERS = {
  [CLAVE_DE_ITEM_DEL_PANEL]: parseAsString,
  panel: parseAsString,
  [CLAVE_DE_DESTINO_DEL_PANEL]: parseAsString,
  [CLAVE_DE_SECCION_DEL_ITEM]: parseAsString,
  [CLAVE_DE_EDICION_DEL_ITEM]: parseAsString,
}

// El panel de un ítem en la URL (`?item=<id>`, 8.13-2): `abrir(id, destino?)` pone `item` (y `destino`, el que eligió el botón del siguiente; sin él, lo quita) y
// quita `panel` (el stock y las imágenes usan `?panel=…&item=`; no se pisan) y vuelve a pedir la página al servidor, que es quien lee el ítem (`shallow: false`). Suma
// al historial: «atrás» lo cierra y, tras recargar, devuelve el foco a quien lo abrió. Cerrar suelta `item`, `destino` y lo abierto dentro del panel (`seccion`, `editar`).
export function useItemPorUrl() {
  const [valores, escribir] = useQueryStates(PARSERS, { shallow: false })
  const abierto = valores[CLAVE_DE_ITEM_DEL_PANEL] !== null && valores.panel === null
  useVueltaDelFoco(CLAVE_DE_ITEM_DEL_PANEL, abierto)
  return {
    abierto,
    // El id de `?item=` mientras el panel está abierto; nulo si no (también con `?panel=`).
    id: abierto ? valores[CLAVE_DE_ITEM_DEL_PANEL] : null,
    abrir: (id: string, destino: string | null = null) => {
      abrirConVuelta(
        CLAVE_DE_ITEM_DEL_PANEL,
        () =>
          escribir(
            {
              [CLAVE_DE_ITEM_DEL_PANEL]: id,
              panel: null,
              [CLAVE_DE_DESTINO_DEL_PANEL]: destino,
              [CLAVE_DE_SECCION_DEL_ITEM]: null,
              [CLAVE_DE_EDICION_DEL_ITEM]: null,
            },
            { history: 'push' },
          ),
        abierto &&
          valores[CLAVE_DE_ITEM_DEL_PANEL] === id &&
          valores[CLAVE_DE_DESTINO_DEL_PANEL] === destino,
      )
    },
    cerrar: () => {
      void escribir({
        [CLAVE_DE_ITEM_DEL_PANEL]: null,
        [CLAVE_DE_DESTINO_DEL_PANEL]: null,
        [CLAVE_DE_SECCION_DEL_ITEM]: null,
        [CLAVE_DE_EDICION_DEL_ITEM]: null,
      })
    },
  }
}
