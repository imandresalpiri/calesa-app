'use client'

import { PencilIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { LiveDeLaVistaPrevia } from './live-de-la-vista-previa'
import type { AvisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { CopiarTextoDeLaTarjeta } from './copiar-texto-de-la-tarjeta'
import { DescargarPdfDeLaTarjeta } from './descargar-pdf-de-la-tarjeta'

type Props = {
  geometria: Geometria | null
  lectura: LecturaDeLaTarjeta | null
  aviso: AvisoDelTotal
  idDelDesactualizado: string
  cotizacionId: string | null
  numero: number | null
  // «Retocar»: nulo si no va (la hoja nueva, quien no puede guardarla, la tarjeta sin leer); con su motivo si va apagado.
  retocar: { motivo: string | null; alRetocar: () => void } | null
}

// «Retocar» (outline, con lápiz); apagado, su motivo a la vista y nombrado por el botón.
function BotonRetocar({ motivo, alRetocar }: { motivo: string | null; alRetocar: () => void }) {
  const id = useId()
  return (
    <>
      {motivo === null ? null : (
        <p
          id={id}
          className="basis-full text-(length:--text-sm) text-(--color-ink-soft) sm:order-first sm:mr-auto sm:basis-auto"
        >
          {motivo}
        </p>
      )}
      <Button
        variant="outline"
        disabled={motivo !== null}
        aria-describedby={motivo === null ? undefined : id}
        onClick={alRetocar}
      >
        <PencilIcon aria-hidden />
        Retocar
      </Button>
    </>
  )
}

// El pie de «Vista previa»: Live, «Copiar texto» y, en una guardada, «Descargar PDF» y «Retocar».
export function PieDeLaVistaPrevia({
  geometria,
  lectura,
  aviso,
  idDelDesactualizado,
  cotizacionId,
  numero,
  retocar,
}: Props) {
  return (
    <>
      <LiveDeLaVistaPrevia />
      <CopiarTextoDeLaTarjeta
        geometria={geometria}
        lectura={lectura}
        aviso={aviso}
        idDelDesactualizado={idDelDesactualizado}
      />
      {cotizacionId === null ? null : (
        <DescargarPdfDeLaTarjeta cotizacionId={cotizacionId} numero={numero} />
      )}
      {retocar === null ? null : <BotonRetocar {...retocar} />}
    </>
  )
}
