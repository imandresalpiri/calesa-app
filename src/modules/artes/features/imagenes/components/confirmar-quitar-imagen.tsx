'use client'

import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { textoDeUsos } from '../../../entities/imagenes'
import type { ImagenDeArte } from '../../../entities/tipos'
import { useQuitarImagen } from '../hooks/use-quitar-imagen'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se quita (la última que se vio, mientras el diálogo se va).
  imagen: ImagenDeArte | null
  // Cambia en cada apertura: vuelve a preguntar cuántas plantillas la usan.
  apertura: string
}

// «Quitar» una imagen de la biblioteca (`?panel=quitar&imagen=<id>`): lo irreversible pide confirmar nombrándola. Una línea reservada dice si
// alguna plantilla de arte la usa; con alguna, «Quitar» queda apagado (la base tampoco la quita).
export function ConfirmarQuitarImagen({ abierto, alCerrar, imagen, apertura }: Props) {
  const quitar = useQuitarImagen({ imagen, apertura })
  const enUso = quitar.usos !== null && quitar.usos > 0
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (await quitar.quitar()) {
          alCerrar()
        }
      }}
      titulo={imagen ? `Quitar «${imagen.nombre}»` : 'Quitar la imagen'}
      descripcion="Sale de la biblioteca y no se puede deshacer."
      etiquetaConfirmar="Quitar"
      enCurso={quitar.enCurso}
      deshabilitado={quitar.leyendo || quitar.fallo !== null || enUso}
      focoAlCerrar={() => false}
    >
      <div role="status" className="flex min-h-11 flex-wrap items-center gap-2 md:min-h-9">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {quitar.fallo ??
            (quitar.usos === null
              ? 'Revisando si alguna plantilla de arte la usa…'
              : textoDeUsos(quitar.usos))}
        </p>
        {quitar.fallo ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={quitar.reintentar}
          >
            Reintentar
          </Button>
        ) : null}
      </div>
    </Confirmar>
  )
}
