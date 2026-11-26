'use client'

import { InfoIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_LA_INFORMACION } from '../../../../entities/informacion-de-la-formula'
import { AccionesEnLaBarra, useEnLaBarra } from '../../../barra-de-la-formula/components'

export const NOMBRE_DE_LA_INFORMACION = 'Información de la fórmula'

type Props = {
  // La marca de aviso (`marcaDeLaInformacion()`): un punto y su texto para el lector. Nula, sin marca.
  marca: { texto: string } | null
}

// El botón ⓘ «Información de la fórmula», que abre su modal (`?panel=info-formula`). En la barra de la fórmula va junto al estado (`lugar="estado"`), sólo con el
// icono (44 px táctil, 36 con puntero fino) y su nombre en `title`; fuera de ella (la puesta en marcha), con el texto a la vista. Lo que bloquea lleva la marca.
export function BotonDeLaInformacion({ marca }: Props) {
  const enLaBarra = useEnLaBarra()
  const panel = usePanelPorUrl(PANEL_DE_LA_INFORMACION)
  const idDeLaMarca = useId()
  const boton = (
    <Button
      type="button"
      variant={enLaBarra ? 'ghost' : 'outline'}
      aria-haspopup="dialog"
      aria-label={enLaBarra ? NOMBRE_DE_LA_INFORMACION : undefined}
      aria-describedby={marca === null ? undefined : idDeLaMarca}
      title={enLaBarra ? NOMBRE_DE_LA_INFORMACION : undefined}
      data-informacion-de-la-formula=""
      className={
        enLaBarra
          ? 'relative min-h-[44px] min-w-[44px] px-0 md:pointer-fine:min-h-9 md:pointer-fine:min-w-9'
          : 'relative min-h-11 md:min-h-9'
      }
      onClick={() => {
        panel.abrir()
      }}
    >
      <InfoIcon aria-hidden className="size-4" />
      {enLaBarra ? null : NOMBRE_DE_LA_INFORMACION}
      {marca === null ? null : (
        <span
          aria-hidden
          data-marca-de-la-informacion=""
          className="absolute top-1.5 right-1.5 size-2 rounded-full bg-(--color-aviso-ink)"
        />
      )}
    </Button>
  )
  return (
    <AccionesEnLaBarra orden={1} lugar="estado">
      {boton}
      {/* Fuera del botón: dentro, sería parte de su nombre. */}
      {marca === null ? null : (
        <span id={idDeLaMarca} className="sr-only">
          {marca.texto}
        </span>
      )}
    </AccionesEnLaBarra>
  )
}
