'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { AVISO_DEL_TOPE_DE_TABLAS } from '../../../entities/tablas/estructura'
import {
  PANEL_NUEVA_TABLA,
  claveDeLaAccion,
  type LugarDeLasTablas,
  type OrigenDeLasTablas,
} from '../../../entities/tablas/rutas'
import { PanelDeNuevaTablaDiferido } from './diferidos'

type Props = {
  origen: OrigenDeLasTablas | null
  lugar: LugarDeLasTablas
  // Ya hay 100 tablas en la lista: no se crea otra (la base dice lo mismo).
  enElTope: boolean
}

// «Nueva tabla»: la acción principal de la lista. Abre `?panel=nueva-tabla` (en el drawer, `&accion=nueva-tabla`), que se pide recién al abrirse; cada apertura empieza de cero (un intento nuevo).
export function BotonDeNuevaTabla({ origen, lugar, enElTope }: Props) {
  const panel = usePanelPorUrl(PANEL_NUEVA_TABLA, [], { clave: claveDeLaAccion(lugar) })
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const apertura = useApertura(panel.abierto)
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {enElTope ? (
          <p className="min-w-0 text-(length:--text-sm) text-(--color-ink-soft)">
            {AVISO_DEL_TOPE_DE_TABLAS}
          </p>
        ) : null}
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          disabled={enElTope}
          onClick={() => {
            panel.abrir()
          }}
        >
          <PlusIcon aria-hidden className="size-4" />
          Nueva tabla
        </Button>
      </div>
      {montado && !enElTope ? (
        <PanelDeNuevaTablaDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          origen={origen}
          lugar={lugar}
        />
      ) : null}
    </>
  )
}
