'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DEL_CONTENEDOR_ABIERTO } from '../../../entities/transporte/paneles'

// Los paneles de `/logistica/embarques` y de la página de un embarque en la URL: `?panel=` (un modal o un drawer: nuevo o editar embarque, agregar o editar contenedor, agregar
// vehículos, un hueco del grupo) y `?contenedor=<uuid>` (el drawer del contenedor, o el destino de lo que abre `?panel=`). `shallow: false`: lo que abren se lee en el servidor.
// Abrir suma al historial («atrás» lo cierra y devuelve el foco: `useVueltaDeLosPaneles`, una vez por página); cerrar un panel vuelve a lo que había debajo (el drawer del contenedor, si estaba).
export function usePanelDeEmbarques() {
  const [valores, escribir] = useQueryStates(
    { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DEL_CONTENEDOR_ABIERTO]: parseAsString },
    { shallow: false, history: 'push' },
  )
  const panel = valores[CLAVE_DE_PANEL]
  const contenedor = valores[CLAVE_DEL_CONTENEDOR_ABIERTO]
  return {
    panel,
    contenedor,
    // Abre un panel; con `contenedorId`, sobre ese contenedor (sin él, conserva el que esté abierto).
    abrir: (valor: string, contenedorId?: string | null) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          escribir({
            [CLAVE_DE_PANEL]: valor,
            ...(contenedorId === undefined ? {} : { [CLAVE_DEL_CONTENEDOR_ABIERTO]: contenedorId }),
          }),
        panel === valor,
      )
    },
    abrirContenedor: (id: string) => {
      abrirConVuelta(
        CLAVE_DEL_CONTENEDOR_ABIERTO,
        () => escribir({ [CLAVE_DE_PANEL]: null, [CLAVE_DEL_CONTENEDOR_ABIERTO]: id }),
        contenedor === id && panel === null,
      )
    },
    // Cierra el panel; `conContenedor: false` cierra también el drawer del contenedor.
    cerrar: ({ conContenedor = true }: { conContenedor?: boolean } = {}) => {
      void escribir(
        {
          [CLAVE_DE_PANEL]: null,
          ...(conContenedor ? {} : { [CLAVE_DEL_CONTENEDOR_ABIERTO]: null }),
        },
        { history: 'replace' },
      )
    },
  }
}

/** La vuelta del foco de `?panel=` y `?contenedor=`: la monta una sola vez la lista o la ficha del embarque. */
export function useVueltaDeLosPaneles() {
  const [valores] = useQueryStates({
    [CLAVE_DE_PANEL]: parseAsString,
    [CLAVE_DEL_CONTENEDOR_ABIERTO]: parseAsString,
  })
  useVueltaDelFoco(CLAVE_DE_PANEL, valores[CLAVE_DE_PANEL] !== null)
  useVueltaDelFoco(CLAVE_DEL_CONTENEDOR_ABIERTO, valores[CLAVE_DEL_CONTENEDOR_ABIERTO] !== null)
}
