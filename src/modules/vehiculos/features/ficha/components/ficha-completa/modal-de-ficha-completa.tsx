'use client'

import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Categoria, OrigenResumen } from '@/modules/origenes/client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import type { Vehiculo } from '../../../../entities/vehiculo'
import { DatosDeLaFichaCompleta } from './datos-de-la-ficha-completa'
import { GaleriaDeLaFichaCompleta } from './galeria-de-la-ficha-completa'

type Props = {
  abierto: boolean
  alCerrar: () => void
  vehiculo: Vehiculo
  origen: OrigenResumen
  categorias: readonly Categoria[]
  // Lo que va abajo, fijo (desde otra pantalla: «Abrir en Vehículos»). Sin pie, nada.
  pie?: ReactNode
}

// La ficha completa del vehículo (docs/GLOSARIO.md › «Ficha completa (del vehículo)»), el «Ver más» de «Datos principales»: casi toda la pantalla en
// escritorio y entera en el celular, para mostrarle el vehículo a un cliente. Arriba fija el título y «Cerrar»; el cuerpo se desplaza: las fotos con su
// tira y los datos; abajo, fijo, el `pie` si llega. Sólo lectura. Vive en `?ver=ficha`: «atrás» y Esc la cierran y el foco vuelve a «Ver más».
export function ModalDeFichaCompleta({
  abierto,
  alCerrar,
  vehiculo,
  origen,
  categorias,
  pie,
}: Props) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        if (!sigueAbierto) alCerrar()
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-ficha-completa=""
        className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-6xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-(--color-line) py-1 pr-1 pl-4">
          <DialogTitle className="min-w-0 flex-1 text-(length:--text-xl) font-semibold break-words">
            {vehiculo.titulo}
          </DialogTitle>
          <DialogClose
            aria-label="Cerrar"
            render={<Button type="button" variant="ghost" size="icon" className="size-11" />}
          >
            <XIcon aria-hidden />
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-5xl gap-6 p-4 md:p-6">
            <GaleriaDeLaFichaCompleta vehiculoId={vehiculo.id} titulo={vehiculo.titulo} />
            <DatosDeLaFichaCompleta vehiculo={vehiculo} origen={origen} categorias={categorias} />
          </div>
        </div>
        {pie === undefined ? null : (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-(--color-line) px-4 py-2">
            {pie}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
