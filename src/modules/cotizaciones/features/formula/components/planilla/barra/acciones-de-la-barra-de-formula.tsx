'use client'

import type { Planilla } from '../../../hooks/use-planilla'
import { TiposDeCelda } from '../menu/tipos-de-celda'
import { ID_DEL_COSTADO } from './ids-del-costado'

// 44 px en una pantalla táctil.
export const BOTON_DE_LA_BARRA =
  'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-line) px-3 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) aria-expanded:bg-(--color-surface-3) md:pointer-fine:min-h-9 md:pointer-fine:min-w-9'

type PanelAlCostado = Planilla['paneles']['totales']

function BotonDelCostado({
  panel,
  id,
  children,
}: {
  panel: PanelAlCostado
  id: string
  children: string
}) {
  return (
    <button
      type="button"
      className={BOTON_DE_LA_BARRA}
      aria-expanded={panel.abierto}
      aria-controls={panel.abierto ? id : undefined}
      onClick={() => {
        if (panel.abierto) panel.cerrar()
        else panel.abrir()
      }}
    >
      {children}
    </button>
  )
}

// A la derecha de la barra de fórmula: «Totales» y «Tarjeta» (los paneles al costado, `?costado=`; tocar el abierto lo cierra) y «?» (los tipos de celda).
export function AccionesDeLaBarraDeFormula({ paneles }: { paneles: Planilla['paneles'] }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <BotonDelCostado panel={paneles.totales} id={ID_DEL_COSTADO.totales}>
        Totales
      </BotonDelCostado>
      <BotonDelCostado panel={paneles.tarjeta} id={ID_DEL_COSTADO.tarjeta}>
        Tarjeta
      </BotonDelCostado>
      <TiposDeCelda className={BOTON_DE_LA_BARRA} />
    </div>
  )
}
