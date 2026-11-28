'use client'

import { CarFrontIcon, ChevronDownIcon, Loader2Icon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { textoDelEjemploElegido } from '../../../../entities/datos/ejemplo-con-datos'
import type { VehiculoDeEjemploDelEditor } from '../../hooks/use-vehiculo-de-ejemplo'
import { PanelDelEjemploDiferido } from './diferidos'
import { ANCHOS_DE_LA_BARRA } from '../rejilla'

type Props = {
  ejemplo: VehiculoDeEjemploDelEditor
  origen: { id: string; nombre: string }
  // Sin `vehiculos.ver` en el origen: apagado, con el motivo.
  motivo: string | null
  sinClientes: boolean
}

// 13rem de 1024 a 1280 px y 16rem desde ahí: con el renglón del guardado, «Guardar» y el «⋯», la barra cabe a 1024 px (`ANCHOS_DE_LA_BARRA`).
const DISPARADOR = `h-8 ${ANCHOS_DE_LA_BARRA.ejemplo} shrink-0 justify-start gap-1.5 px-2`

// El disparador «Vehículo de ejemplo» de la barra (docs/GLOSARIO.md), de ancho fijo (el título largo se corta): dice con qué datos se ve el
// arte y abre el popover para elegir el vehículo, su cotización y su lead. Mientras lee, el reloj; sin permiso, apagado y dice por qué.
export function VehiculoDeEjemplo({ ejemplo, origen, motivo, sinClientes }: Props) {
  const [abierto, setAbierto] = useState(false)
  const idDelMotivo = useId()
  const texto = textoDelEjemploElegido(ejemplo.elegido)
  const Icono = ejemplo.lectura.cargando ? Loader2Icon : CarFrontIcon
  const icono = (
    <Icono
      aria-hidden
      className={ejemplo.lectura.cargando ? 'size-4 shrink-0 animate-spin' : 'size-4 shrink-0'}
    />
  )
  if (motivo !== null) {
    return (
      <span title={motivo} className="shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          aria-describedby={idDelMotivo}
          className={DISPARADOR}
        >
          {icono}
          <span className="truncate">{texto}</span>
        </Button>
        <span id={idDelMotivo} className="sr-only">
          {motivo}
        </span>
      </span>
    )
  }
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            title={texto}
            data-vehiculo-de-ejemplo-disparador
            className={DISPARADOR}
          />
        }
      >
        {icono}
        <span className="min-w-0 flex-1 truncate text-left">{texto}</span>
        <ChevronDownIcon aria-hidden className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Vehículo de ejemplo"
        className="h-[34rem] max-h-[calc(100dvh-4rem)] w-96 gap-0 p-0"
      >
        {/* El popup se monta al abrirse: recién ahí se pide el código del panel. */}
        <PanelDelEjemploDiferido ejemplo={ejemplo} origen={origen} sinClientes={sinClientes} />
      </PopoverContent>
    </Popover>
  )
}
