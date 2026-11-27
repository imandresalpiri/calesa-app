'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@/shared/ui/popover'
import type { TipoCambioVigente } from '../../../../../entities/tipos-cambio-vigentes'
import { useParaCompartir } from '../../../hooks/use-para-compartir'
import { AccionesDeCompartir } from './acciones-de-compartir'
import { ElegirTipos } from './elegir-tipos'
import { VistaPrevia } from './vista-previa'

type Props = {
  // Los vigentes que el popover ya leyó (hasta 30).
  filas: readonly TipoCambioVigente[]
  // Los que la empresa puso en la barra: lo que se comparte por defecto.
  idsEnLaBarra: readonly string[]
  alVolver: () => void
}

// Qué va marcado al abrir: los de la barra que siguen vigentes; si ninguno lo está, el primero (el por defecto va adelante).
function marcadosAlAbrir(
  filas: readonly TipoCambioVigente[],
  idsEnLaBarra: readonly string[],
): Set<string> {
  const vigentes = new Set(filas.map((tipo) => tipo.id))
  const deLaBarra = idsEnLaBarra.filter((id) => vigentes.has(id))
  const primero = filas[0]
  return new Set(deLaBarra.length > 0 ? deLaBarra : primero ? [primero.id] : [])
}

// «Compartir» del popover de la barra: elegir los tipos (sólo para este envío), ver la imagen y el texto tal como saldrán y copiarlos, descargarlos o
// mandarlos por el menú del sistema. Se pide con `diferido()` al tocar «Compartir». Con el Modo Live la vista previa va sin moneda y lo que se copia, descarga o
// comparte, completo.
export function PanelDeCompartir({ filas, idsEnLaBarra, alVolver }: Props) {
  const [elegidos, setElegidos] = useState(() => marcadosAlAbrir(filas, idsEnLaBarra))
  // En el orden de la lista (el que el popover muestra), no en el de los toques.
  const ids = filas.filter((tipo) => elegidos.has(tipo.id)).map((tipo) => tipo.id)
  const { live } = useLive()
  const para = useParaCompartir(ids, live)

  return (
    <div className="grid max-h-[calc(100dvh-5rem)] min-w-0 gap-3 overflow-y-auto">
      <PopoverHeader>
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 h-11 w-fit md:h-8"
          onClick={alVolver}
        >
          <ArrowLeftIcon aria-hidden />
          Volver a los tipos de cambio
        </Button>
        <PopoverTitle>Compartir tipos de cambio</PopoverTitle>
        <PopoverDescription>
          Imagen y texto con la marca de la empresa, para mandar a un cliente.
        </PopoverDescription>
      </PopoverHeader>
      <ElegirTipos
        filas={filas}
        elegidos={elegidos}
        alMarcar={(id, marcado) => {
          setElegidos((antes) => {
            const nuevo = new Set(antes)
            if (marcado) {
              nuevo.add(id)
            } else {
              nuevo.delete(id)
            }
            return nuevo
          })
        }}
      />
      <VistaPrevia
        imagen={para.imagenALaVista}
        texto={para.textoALaVista}
        reintentarImagen={para.reintentarImagen}
        reintentarTexto={para.reintentarTexto}
      />
      {/* Los botones quedan a la vista aunque el panel se desplace. */}
      <div className="bg-popover sticky bottom-0 border-t border-(--color-line) pt-2">
        <AccionesDeCompartir imagen={para.imagen} texto={para.texto} sinElegir={ids.length === 0} />
      </div>
    </div>
  )
}
