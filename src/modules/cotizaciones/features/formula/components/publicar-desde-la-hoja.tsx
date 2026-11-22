'use client'

import { Button } from '@/shared/ui/button'
import { AccionesEnLaBarra, useContextoDeLaBarra } from '../../barra-de-la-formula/components'
import { borradorAtrasado, type LecturaDeLaFormula } from '../../../entities/formula/versiones'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { AccionesDeLaFormula } from './acciones-de-la-formula'

type Props = {
  origen: { id: string; nombre: string }
  // La publicada y el borrador de la fórmula del origen que abre la pestaña (los mismos que lee la Planilla).
  formula: LecturaDeLaFormula
}

export const MOTIVO_DE_PUBLICAR_DESDE_LA_HOJA = 'Guarda el borrador antes de publicar.'
const ID_DEL_MOTIVO = 'hoja-motivo-de-publicar'

// «Publicar…» del borrador en la barra de la fórmula de la pestaña Hoja (orden 2, tras «Guardar el borrador»), con el mismo modal de la Planilla
// (`?panel=publicar-formula`). Espera mientras el editor de la hoja tenga cambios sin guardar (lo dice el estado de la barra): se publica lo guardado. Sin
// borrador, o con uno atrasado, no se ofrece; con cambios sobre la publicada se ve apagado, con su motivo.
export function PublicarDesdeLaHoja({ origen, formula }: Props) {
  const panel = usePanelDeLaFormula()
  const espera = useContextoDeLaBarra()?.estado?.tipo === 'cambios'
  const hayBorrador =
    formula.borrador !== null && !borradorAtrasado(formula.borrador, formula.publicada)
  return (
    <>
      {hayBorrador || espera ? (
        <AccionesEnLaBarra orden={2}>
          {espera ? (
            <span
              id={ID_DEL_MOTIVO}
              className="text-(length:--text-sm) text-(--color-ink-soft)"
              data-motivo-de-publicar=""
            >
              {MOTIVO_DE_PUBLICAR_DESDE_LA_HOJA}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={espera}
            aria-describedby={espera ? ID_DEL_MOTIVO : undefined}
            onClick={panel.abrirPublicar}
          >
            Publicar…
          </Button>
        </AccionesEnLaBarra>
      ) : null}
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </>
  )
}
