'use client'

import { ListIcon, WorkflowIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { MOTIVO_SIN_ORDEN_AQUI, useOrdenDeFases } from '../hooks/use-orden-de-fases'
import { usePanelDelFlujo } from '../hooks/use-panel-del-flujo'
import { useVistaDelFlujo } from '../hooks/use-vista-del-flujo'
import type { HuecosDelFlujo } from './huecos'

type Props = {
  flujo: FlujoParaConfigurar
  huecos: HuecosDelFlujo
  // Quien sólo gestiona los catálogos de logística del origen ve las fases sin cambiarlas.
  soloLectura: boolean
  // Los botones de los catálogos de logística (los compone `src/app`: `flujos` no importa `logistica`).
  catalogos: ReactNode
}

export const TEXTO_DE_LECTURA = 'Toca una fase para verla.'
export const MOTIVO_DE_LECTURA =
  'Las fases las cambia quien tiene el permiso «Configurar el flujo».'

export const ID_DEL_MOTIVO_SIN_ORDEN = 'motivo-sin-orden-de-fases'

const BOTON = 'h-11 md:h-8'

// La barra del flujo, sobre las fases: el título, «Reglas del flujo» (se abre en el panel), los catálogos de logística (cada uno abre su drawer), «Ver como
// lista» o «Ver como diagrama» (en todo ancho) y, en la lista, «Nueva fase» (hueco del área `fases`, con sus modales, una vez por pantalla; en el diagrama
// está en su barra flotante). Si no se puede ordenar, el motivo en texto; en sólo lectura, quién cambia las fases. Se parte en renglones: con el texto al
// 200 % no ensancha la página.
export function BarraDelFlujo({ flujo, huecos, soloLectura, catalogos }: Props) {
  const panel = usePanelDelFlujo()
  const vista = useVistaDelFlujo()
  const orden = useOrdenDeFases()
  const AccionesDeLaLista = huecos.accionesDeLaLista
  const motivo = soloLectura
    ? MOTIVO_DE_LECTURA
    : flujo.fases.length < 2
      ? null
      : orden === null
        ? MOTIVO_SIN_ORDEN_AQUI
        : orden.motivo
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
          {soloLectura
            ? TEXTO_DE_LECTURA
            : vista.vista === 'diagrama'
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
        {catalogos}
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
