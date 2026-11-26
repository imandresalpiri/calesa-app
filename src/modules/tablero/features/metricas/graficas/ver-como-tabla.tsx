'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { ModalDeLaTablaDiferido } from './diferidos'

export const PANEL_DE_LA_TABLA = 'tabla'
export const CLAVE_DE_LA_GRAFICA = 'grafica'

type Props = {
  // La clave del widget (`leads-por-dia`): sólo abre el modal la `?grafica=` que es la suya.
  clave: string
  titulo: string
  // La tabla, dibujada en el servidor (`<TablaEquivalente>`).
  children: ReactNode
}

// «Ver como tabla»: un botón que abre, en un modal con su URL (`?panel=tabla&grafica=<clave>`), los mismos números de la gráfica. El widget no
// cambia de alto y el código del modal se pide al abrirse.
export function VerComoTabla({ clave, titulo, children }: Props) {
  const panel = usePanelPorUrl(PANEL_DE_LA_TABLA, [CLAVE_DE_LA_GRAFICA])
  const abierto = panel.abierto && panel.valor(CLAVE_DE_LA_GRAFICA) === clave
  const montar = useAbiertoAlgunaVez(abierto)
  return (
    <>
      <Button
        type="button"
        variant="link"
        aria-haspopup="dialog"
        className="h-11 w-fit justify-self-start px-0 md:h-7"
        onClick={() => {
          panel.abrir({ [CLAVE_DE_LA_GRAFICA]: clave })
        }}
      >
        Ver como tabla
      </Button>
      {montar ? (
        <ModalDeLaTablaDiferido abierto={abierto} alCerrar={panel.cerrar} titulo={titulo}>
          {children}
        </ModalDeLaTablaDiferido>
      ) : null}
    </>
  )
}
