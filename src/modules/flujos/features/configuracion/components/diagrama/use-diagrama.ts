'use client'

import { useMemo, type RefObject } from 'react'
import { disponerDiagrama, medidasDelDiagrama } from '../../../../entities/disposicion-del-diagrama'
import { edicionDelLienzo } from '../../../../entities/edicion-del-lienzo'
import type { FlujoParaConfigurar } from '../../../../entities/flujo'
import type { RolLeido } from '../../../../entities/lectura-de-fase'
import { enPx } from '../../../../entities/posiciones-del-diagrama'
import { disponerConPosiciones } from '../../../../entities/trazado-de-salidas'
import { useFasesDelDiagrama } from '../../hooks/use-fases-del-diagrama'
import { useMarcasDelDiagrama } from '../../hooks/use-marcas-del-diagrama'
import { useSalidasDelDiagrama } from '../../hooks/use-salidas-del-diagrama'
import { useVistaDelFlujo } from '../../hooks/use-vista-del-flujo'
import { flechasDelDiagrama, nodosDelDiagrama } from './datos-del-diagrama'
import { useEscrituraDelLienzo } from './use-escritura-del-lienzo'
import { usePosicionesDelLienzo } from './use-posiciones-del-lienzo'
import { useVincular } from './use-vincular'

type Pedido = {
  flujo: FlujoParaConfigurar
  roles: readonly RolLeido[]
  faseAbierta: string | null
  rem: number
  contenedor: RefObject<HTMLElement | null>
}

// Lo que dibuja el lienzo y lo que se puede hacer en él: el acomodo automático (la ruta de cada flecha, y dónde va cada fase si ninguna tiene posición),
// las posiciones en pantalla (lo leído con lo movido encima), las cajas y flechas de React Flow, qué edición vale aquí (`edicionDelLienzo`) y vincular.
// Todas las escrituras van por una sola cola (`useEscrituraDelLienzo`).
export function useDiagrama({ flujo, roles, faseAbierta, rem, contenedor }: Pedido) {
  const medidas = useMemo(() => medidasDelDiagrama(rem), [rem])
  const marcas = useMarcasDelDiagrama()
  const { angosto } = useVistaDelFlujo()
  const fases = useFasesDelDiagrama()
  const salidas = useSalidasDelDiagrama()
  const escribir = useEscrituraDelLienzo(flujo.version)
  const auto = useMemo(
    () => disponerDiagrama(flujo.fases, flujo.transiciones, medidas),
    [flujo.fases, flujo.transiciones, medidas],
  )
  const posiciones = usePosicionesDelLienzo({ flujo, auto, rem, escribir })
  const disposicion = useMemo(
    () => disponerConPosiciones(auto, enPx(posiciones.efectivas, rem)),
    [auto, posiciones.efectivas, rem],
  )
  const base = useMemo(
    () => nodosDelDiagrama({ disposicion, flujo, fases: flujo.fases, roles, marcas, faseAbierta }),
    [disposicion, flujo, roles, marcas, faseAbierta],
  )
  const flechas = useMemo(
    () => flechasDelDiagrama({ disposicion, flujo, marcas, faseAbierta }),
    [disposicion, flujo, marcas, faseAbierta],
  )
  const edicion = edicionDelLienzo({
    fases: fases && {
      motivoDeMover: fases.motivoDeMover,
      motivoDeNuevaFase: fases.motivoDeNuevaFase,
    },
    conSalidas: salidas !== null,
    angosto,
  })
  const vincular = useVincular({ flujo, contenedor, escribir })
  return {
    medidas,
    disposicion,
    base,
    flechas,
    edicion,
    posiciones,
    vincular,
    fases,
    salidas,
    angosto,
  }
}
