'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { AccionesEnLaBarra } from '../../barra-de-la-formula/components'
import { motivoParaNoPublicar } from '../../../entities/plantilla/publicar-la-plantilla'

type Props = {
  // El `actualizadoEn` del borrador leído: nulo, no hay borrador.
  esperada: string | null
  // Lo que se ve en el editor no es lo guardado.
  hayCambios: boolean
  // Guardando, recargando o con un conflicto del guardado: nada se pide ahora.
  ocupado: boolean
  // «Guardar borrador»: se puede, por qué no (la forma o los 24 KiB) y si está guardando.
  guardar: { puede: boolean; motivo: string | null; enCurso: boolean; alGuardar: () => void }
  alPublicar: () => void
  alDescartar: () => void
}

export const ID_DEL_MOTIVO_DE_PUBLICAR = 'tarjeta-motivo-de-publicar'

// Los botones de las versiones, con una acción principal: «Guardar borrador»; «Publicar…» a la vista (cambia la imagen que recibe el cliente, como en V1) y
// «Descartar borrador…» en el «⋯». Viven en el editor porque saben si hay cambios sin guardar. «Publicar…» se apaga con su motivo **escrito a la vista**: sin borrador, o con
// cambios sin guardar (se publica lo guardado, no lo que se ve). No se apaga por «Con esto no se podría publicar»: decide la base, cuyo rechazo vuelve al modal. El «⋯»
// sólo existe con borrador. El permiso es el de la pestaña (`cotizaciones.configurar` del origen); la action y la base lo vuelven a pedir.
export function BotonesDeLaPlantilla({
  esperada,
  hayCambios,
  ocupado,
  guardar,
  alPublicar,
  alDescartar,
}: Props) {
  const motivo = motivoParaNoPublicar({ esperada, hayCambios })
  const idDeGuardar = useId()
  return (
    // Vacío (sin motivos que decir) no ocupa lugar: en la página del origen los botones van a la barra de la fórmula y acá quedan sólo sus motivos.
    <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
      <AccionesEnLaBarra orden={1}>
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          disabled={!guardar.puede || ocupado}
          aria-describedby={guardar.motivo === null ? undefined : idDeGuardar}
          onClick={guardar.alGuardar}
        >
          {guardar.enCurso ? 'Guardando…' : 'Guardar borrador'}
        </Button>
      </AccionesEnLaBarra>
      <AccionesEnLaBarra orden={2}>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={ocupado || motivo !== null}
          aria-describedby={motivo === null ? undefined : ID_DEL_MOTIVO_DE_PUBLICAR}
          onClick={alPublicar}
        >
          Publicar…
        </Button>
      </AccionesEnLaBarra>
      {esperada === null ? null : (
        <AccionesEnLaBarra orden={3}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Más acciones de la tarjeta"
              disabled={ocupado}
              className="flex size-[44px] items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:size-9"
            >
              <MoreHorizontalIcon aria-hidden className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-(--available-width)">
              <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={alDescartar}>
                Descartar borrador…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </AccionesEnLaBarra>
      )}
      {guardar.motivo === null ? null : (
        <p
          id={idDeGuardar}
          className="basis-full text-right text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {guardar.motivo}
        </p>
      )}
      {motivo === null ? null : (
        <p
          id={ID_DEL_MOTIVO_DE_PUBLICAR}
          className="basis-full text-right text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {motivo}
        </p>
      )}
    </div>
  )
}
