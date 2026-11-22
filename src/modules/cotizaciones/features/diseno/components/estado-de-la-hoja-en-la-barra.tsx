'use client'

import { useEstadoEnLaBarra } from '../../barra-de-la-formula/hooks/use-estado-en-la-barra'
import { estadoDeLaHoja } from '../../../entities/diseno/estado-de-la-edicion'
import type { useGuardadoDelDiseno } from '../hooks/use-guardar-diseno'

// El estado de la hoja, dicho a la barra de la fórmula (Cambios sin guardar · Borrador · Publicada vN). Fuera de la barra no hace nada ni dibuja.
export function EstadoDeLaHojaEnLaBarra({
  guardado,
}: {
  guardado: Pick<ReturnType<typeof useGuardadoDelDiseno>, 'hayCambios' | 'versionEditada'>
}) {
  useEstadoEnLaBarra(estadoDeLaHoja(guardado.hayCambios, guardado.versionEditada))
  return null
}
