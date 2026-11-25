'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_LA_ACCION_DE_LA_TABLA, PANEL_DE_LAS_TABLAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

const CLAVES = {
  [CLAVE_DE_PANEL]: parseAsString,
  tabla: parseAsString,
  [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: parseAsString,
}

// «Abrir en Tablas»: el drawer de tablas de la barra de la fórmula (`?panel=tablas&tabla=<id>`) con la tabla del bloque abierta, sin dejar la pestaña, la
// fórmula ni la pieza elegida (lo editado sigue ahí). Al cerrarlo (también con «atrás» tras recargar), el foco vuelve a este botón.
export function AbrirEnTablas({ tablaId }: { tablaId: string }) {
  const [valores, escribir] = useQueryStates(CLAVES)
  const abierto = valores[CLAVE_DE_PANEL] === PANEL_DE_LAS_TABLAS
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return (
    <Button
      type="button"
      variant="link"
      aria-haspopup="dialog"
      className="min-h-11 w-fit px-0 md:min-h-8"
      onClick={() => {
        abrirConVuelta(
          CLAVE_DE_PANEL,
          () =>
            escribir(
              {
                [CLAVE_DE_PANEL]: PANEL_DE_LAS_TABLAS,
                tabla: tablaId,
                [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: null,
              },
              { history: 'push', shallow: false, scroll: false },
            ),
          abierto,
        )
      }}
    >
      Abrir en Tablas
    </Button>
  )
}
