'use client'

import { ListIcon, WorkflowIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { MOTIVO_SIN_ORDEN_AQUI, useOrdenDeFases } from '../hooks/use-orden-de-fases'
import { usePanelDelFlujo } from '../hooks/use-panel-del-flujo'
import { useVistaDelFlujo } from '../hooks/use-vista-del-flujo'
import type { HuecosDelFlujo } from './huecos'

type Props = { flujo: FlujoParaConfigurar; huecos: HuecosDelFlujo }

export const ID_DEL_MOTIVO_SIN_ORDEN = 'motivo-sin-orden-de-fases'

const BOTON = 'h-11 md:h-8'

// La barra del flujo, sobre las fases: el título, lo del flujo entero que se abre en el panel («Reglas del flujo», «Tipos de documento»), «Ver como lista» o
// «Ver como diagrama» (en todo ancho) y, en la lista, «Nueva fase» (hueco del área `fases`, con sus modales, una vez por pantalla; en el diagrama está en su
// barra flotante). Si no se puede ordenar,
// el motivo en texto. Se parte en renglones: con el texto al 200 % no ensancha la página.
export function BarraDelFlujo({ flujo, huecos }: Props) {
  const panel = usePanelDelFlujo()
  const vista = useVistaDelFlujo()
  const orden = useOrdenDeFases()
  const AccionesDeLaLista = huecos.accionesDeLaLista
  const motivo =
    flujo.fases.length < 2 ? null : orden === null ? MOTIVO_SIN_ORDEN_AQUI : orden.motivo
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="grid min-w-0 gap-0.5">
        <h2
          id="titulo-de-fases"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Fases
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {vista.vista === 'diagrama'
            ? 'Toca una fase para editarla. El orden se cambia desde su «⋯».'
            : 'En el orden del flujo: toca una fase para editarla.'}
        </p>
        {motivo === null ? null : (
          <p
            id={ID_DEL_MOTIVO_SIN_ORDEN}
            className="text-(length:--text-sm) text-(--color-ink-faint)"
          >
            {motivo}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        {panel.disponibles.includes('reglas') ? (
          <Button
            variant="outline"
            className={BOTON}
            onClick={() => {
              panel.abrirSeccion('reglas')
            }}
          >
            Reglas del flujo
          </Button>
        ) : null}
        {panel.disponibles.includes('documentos') ? (
          <Button
            variant="outline"
            className={BOTON}
            onClick={() => {
              panel.abrirSeccion('documentos')
            }}
          >
            Tipos de documento
          </Button>
        ) : null}
        {flujo.fases.length > 0 ? (
          <Button variant="outline" className={BOTON} onClick={vista.alternar}>
            {vista.vista === 'diagrama' ? <ListIcon aria-hidden /> : <WorkflowIcon aria-hidden />}
            {vista.vista === 'diagrama' ? 'Ver como lista' : 'Ver como diagrama'}
          </Button>
        ) : null}
        {AccionesDeLaLista ? <AccionesDeLaLista flujo={flujo} /> : null}
      </div>
    </div>
  )
}
