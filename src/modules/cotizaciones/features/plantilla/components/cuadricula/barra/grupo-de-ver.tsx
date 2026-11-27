'use client'

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'
import {
  CIFRAS_DE_EJEMPLO,
  motivoSinCotizacion,
  nombreDeLaReferencia,
} from '../../../../../entities/plantilla/referencia-del-lienzo'
import type { ReferenciaDeLaTarjeta } from '../../../../../entities/referencia-de-la-tarjeta'
import type { EscalaDelLienzo } from '../../../../../entities/vista-previa-de-la-plantilla'
import { GrupoDeLaBarra, MenuDeLaBarra } from './elementos'

type Props = {
  referencia: ReferenciaDeLaTarjeta
  ejemplo: boolean
  origen: string
  alElegirReferencia: (ejemplo: boolean) => void
  escala: EscalaDelLienzo
  alCambiarLaEscala: (escala: EscalaDelLienzo) => void
  // El tamaño de la tarjeta dibujada, en px.
  tamano: { ancho: number; alto: number } | null
}

const TITULO_DEL_MENU = 'text-(length:--text-xs) font-medium text-(--color-ink-soft) px-1.5 py-1'

// «Ver ▾»: la referencia con la que se dibuja el lienzo (la cotización más reciente del origen que ves o las cifras de ejemplo), «Ajustar | 100 %» y el tamaño de la tarjeta.
export function GrupoDeVer({
  referencia,
  ejemplo,
  origen,
  alElegirReferencia,
  escala,
  alCambiarLaEscala,
  tamano,
}: Props) {
  const motivo = motivoSinCotizacion(referencia, origen)
  const conCotizacion = referencia.estado === 'cotizacion'
  return (
    <GrupoDeLaBarra nombre="Ver">
      <MenuDeLaBarra titulo="Ver" ocupado={false}>
        <p className={TITULO_DEL_MENU}>Referencia</p>
        <DropdownMenuRadioGroup
          value={conCotizacion && !ejemplo ? 'cotizacion' : 'ejemplo'}
          onValueChange={(valor) => {
            alElegirReferencia(valor === 'ejemplo')
          }}
          data-referencia-del-lienzo=""
        >
          {conCotizacion ? (
            <DropdownMenuRadioItem value="cotizacion" className="min-h-11 md:min-h-8">
              {nombreDeLaReferencia(referencia)}
            </DropdownMenuRadioItem>
          ) : null}
          <DropdownMenuRadioItem
            value="ejemplo"
            disabled={!conCotizacion}
            className="min-h-11 md:min-h-8"
          >
            {CIFRAS_DE_EJEMPLO}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {motivo === null ? null : (
          <p className="max-w-64 px-1.5 pb-1 text-(length:--text-xs) text-(--color-ink-soft)">
            {motivo}
          </p>
        )}
        <DropdownMenuSeparator />
        <p className={TITULO_DEL_MENU}>Tamaño del lienzo</p>
        <DropdownMenuRadioGroup
          value={escala}
          onValueChange={(valor) => {
            alCambiarLaEscala(valor === 'real' ? 'real' : 'ajustar')
          }}
        >
          <DropdownMenuRadioItem value="ajustar" className="min-h-11 md:min-h-8">
            Ajustar
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="real" className="min-h-11 md:min-h-8">
            100 %
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {tamano === null ? null : (
          <>
            <DropdownMenuSeparator />
            <p
              className="px-1.5 py-1 text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
              data-tamano-del-lienzo=""
            >
              Tarjeta de {tamano.ancho} × {tamano.alto} px
            </p>
          </>
        )}
      </MenuDeLaBarra>
    </GrupoDeLaBarra>
  )
}
