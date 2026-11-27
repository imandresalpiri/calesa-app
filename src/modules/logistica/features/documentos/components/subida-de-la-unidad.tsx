'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_SUBIR,
  CLAVE_DEL_TIPO_A_SUBIR,
} from '../../../entities/nucleo/paneles-de-la-unidad'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useEnLaPagina } from '../../nucleo/disposicion'
import type { DatoDeDocumentos } from '../hooks/use-documentos-de-la-unidad'
import { usePuedeSubirALaUnidad } from '../hooks/use-puede-subir-a-la-unidad'
import { DrawerParaSubirDiferido } from './diferidos'
import { ZonaParaSubirDeLaUnidad } from './zona-para-subir-de-la-unidad'

const SIN_PERMISO = 'Necesitas permiso para subir documentos.'

// Cómo se ofrece subir en el hueco «Documentos»: en la página de la unidad (dentro del drawer de la tarjeta), un botón «Subir documentos» que abre el drawer de subir
// (`?subir=documentos`); en los drawers de gastos e ítem y en la ficha del vehículo, la bandeja en línea, como siempre. Sin permiso, el botón queda apagado con su motivo escrito debajo.
export function SubidaDeLaUnidad({ unidad, dato }: { unidad: Unidad; dato: DatoDeDocumentos }) {
  const enLaPagina = useEnLaPagina()
  if (!enLaPagina) return <ZonaParaSubirDeLaUnidad unidad={unidad} dato={dato} />
  return <SubidaEnUnDrawer unidad={unidad} dato={dato} />
}

function SubidaEnUnDrawer({ unidad, dato }: { unidad: Unidad; dato: DatoDeDocumentos }) {
  const puedeSubir = usePuedeSubirALaUnidad(unidad)
  // `&tipo_documento=` (lo pone «Subir» de «Qué falta») entra con el tipo elegido; cerrar limpia las dos claves.
  const subir = usePanelPorUrl('documentos', [CLAVE_DEL_TIPO_A_SUBIR], { clave: CLAVE_DE_SUBIR })
  const idDelMotivo = useId()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        className="min-h-11 md:min-h-9"
        disabled={puedeSubir !== true}
        aria-describedby={puedeSubir === false ? idDelMotivo : undefined}
        onClick={() => {
          subir.abrir()
        }}
      >
        Subir documentos
      </Button>
      {puedeSubir === false ? (
        <p id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {SIN_PERMISO}
        </p>
      ) : null}
      {/* Una URL a mano no abre lo que el permiso no deja. */}
      <DrawerParaSubirDiferido
        abierto={subir.abierto && puedeSubir === true}
        alCerrar={subir.cerrar}
        unidad={unidad}
        dato={dato}
      />
    </div>
  )
}
