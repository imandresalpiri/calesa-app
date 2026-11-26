'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { AccionDeLaBarra, AccionesDeLaBarra } from '../../../../entities/contenido/guias'

type Props = {
  acciones: AccionesDeLaBarra
  enCurso: boolean
  // El id del texto (sólo para lectores de pantalla) que dice por qué una acción está apagada.
  idDelMotivo: string
  alEjecutar: (accion: AccionDeLaBarra['accion']) => void
}

const TACTIL = 'min-h-11 md:min-h-9'

// Lo que la barra ofrece para guardar y publicar: la acción principal, la de al lado y el «⋯» con el resto. Una apagada dice su motivo (en su
// título y, para quien no ve, en el texto que enlaza `aria-describedby`).
export function AccionesDePublicacion({ acciones, enCurso, idDelMotivo, alEjecutar }: Props) {
  const { principal, segundo, enElMenu } = acciones
  return (
    <div className="flex items-center gap-2">
      {segundo ? (
        <Button
          type="button"
          variant="outline"
          className={TACTIL}
          disabled={enCurso || segundo.motivo !== null}
          onClick={() => {
            alEjecutar(segundo.accion)
          }}
        >
          {segundo.etiqueta}
        </Button>
      ) : null}
      <Button
        type="button"
        className={TACTIL}
        disabled={enCurso || principal.motivo !== null}
        title={principal.motivo ?? undefined}
        aria-describedby={principal.motivo ? idDelMotivo : undefined}
        onClick={() => {
          alEjecutar(principal.accion)
        }}
      >
        {enCurso ? 'Guardando…' : principal.etiqueta}
      </Button>
      {enElMenu.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 md:size-9"
                aria-label="Más acciones de publicación"
                disabled={enCurso}
              />
            }
          >
            <MoreHorizontalIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-w-(--available-width)">
            {enElMenu.map((accion) => (
              <DropdownMenuItem
                key={accion.accion}
                disabled={accion.motivo !== null}
                className="min-h-11 md:min-h-8"
                onClick={() => {
                  alEjecutar(accion.accion)
                }}
              >
                {accion.etiqueta}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
