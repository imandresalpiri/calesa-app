'use client'

import { TableIcon } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_LA_ACCION_DE_LA_TABLA, PANEL_DE_LAS_TABLAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

const CLAVES = {
  [CLAVE_DE_PANEL]: parseAsString,
  tabla: parseAsString,
  [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: parseAsString,
}

const SIN_LAS_TABLAS = {
  [CLAVE_DE_PANEL]: null,
  tabla: null,
  [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: null,
}

type Props = {
  // La lista o la tabla abierta, dibujada por el servidor sólo con `?panel=tablas`; nula mientras llega.
  children: ReactNode
}

// «Tablas» en la barra de la fórmula y su drawer (`?panel=tablas`, con `tabla=<id>` y el panel de la tabla en `accion=`): las tablas de referencia del origen y
// las compartidas que usa, sin dejar la pestaña ni la fórmula elegida. Va siempre montado (así se desliza); abrirlo va al servidor, que dibuja lo de adentro, y
// mientras llega se ve el esqueleto. Cerrar quita las tres claves. Lo editado de una tabla queda en su borrador de la pestaña del navegador: cerrar no lo pierde.
export function DrawerDeLasTablas({ children }: Props) {
  const [valores, escribir] = useQueryStates(CLAVES)
  const abierto = valores[CLAVE_DE_PANEL] === PANEL_DE_LAS_TABLAS
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          abrirConVuelta(
            CLAVE_DE_PANEL,
            () =>
              escribir(
                { ...SIN_LAS_TABLAS, [CLAVE_DE_PANEL]: PANEL_DE_LAS_TABLAS },
                { history: 'push', shallow: false, scroll: false },
              ),
            abierto,
          )
        }}
      >
        <TableIcon aria-hidden className="size-4" />
        Tablas
      </Button>
      <Drawer
        abierto={abierto}
        alCerrar={() => {
          void escribir(SIN_LAS_TABLAS, { scroll: false })
        }}
        titulo="Tablas de referencia"
        descripcion="Las de este origen y las compartidas que usa."
        ancho="amplio"
      >
        {children ?? <EsqueletoFormulario bloques={2} campos={4} />}
      </Drawer>
    </>
  )
}
