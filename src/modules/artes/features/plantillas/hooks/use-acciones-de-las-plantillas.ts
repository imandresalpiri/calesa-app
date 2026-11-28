'use client'

import { useRouter } from 'next/navigation'
import { rutaDeLaPlantillaDeArte } from '@/shared/lib/rutas'
import type { AccionDeMenu } from '@/shared/ui/lista'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  lineasDeLaPlantilla,
  type ClaveDeAccionDeArte,
} from '../../../entities/acciones-de-la-plantilla'
import {
  CLAVE_DE_LA_PLANTILLA,
  PANEL_ELIMINAR_PLANTILLA,
  PANEL_HACERLA_PRIVADA,
} from '../../../entities/paneles'
import type { QuienMira } from '../../../entities/permisos-de-artes'
import { esLaPorDefecto } from '../../../entities/por-defecto'
import type { OrigenDeArtes, PlantillaDeArte, PorDefecto } from '../../../entities/tipos'
import type { PlantillasCargadas } from './use-plantillas'
import { useConfirmacionDeLaPlantilla } from './use-confirmacion-de-la-plantilla'
import { useDuplicarPlantilla } from './use-duplicar-plantilla'
import { useEliminarPlantilla } from './use-eliminar-plantilla'
import { usePorDefectoDeArtes } from './use-por-defecto-de-artes'
import { useVisibilidadDeLaPlantilla } from './use-visibilidad-de-la-plantilla'

type Parametros = {
  quien: QuienMira
  origenes: readonly OrigenDeArtes[]
  porDefecto: readonly PorDefecto[]
  plantillas: PlantillasCargadas
}

// Lo que hace cada línea del «⋯» de una plantilla de arte (la lista y su orden son de `lineasDeLaPlantilla()`): duplicar, la por defecto y
// la visibilidad de una propia van directo, con su aviso (lo reversible, con «Deshacer»); hacer privada la de otra persona y eliminar abren su
// confirmación por URL. Un error vuelve como aviso (un conflicto, con «Recargar»).
export function useAccionesDeLasPlantillas({
  quien,
  origenes,
  porDefecto,
  plantillas,
}: Parametros) {
  const router = useRouter()
  const nombreDelOrigen = (id: string) => origenes.find((o) => o.id === id)?.nombre ?? 'su origen'
  const duplicar = useDuplicarPlantilla()
  const porDefectoDe = usePorDefectoDeArtes(porDefecto, nombreDelOrigen)
  const visibilidad = useVisibilidadDeLaPlantilla()
  const eliminacion = useEliminarPlantilla()
  const confirmarEliminar = useConfirmacionDeLaPlantilla(
    usePanelPorUrl(PANEL_ELIMINAR_PLANTILLA, [CLAVE_DE_LA_PLANTILLA]),
    plantillas.porId,
  )
  const confirmarPrivada = useConfirmacionDeLaPlantilla(
    usePanelPorUrl(PANEL_HACERLA_PRIVADA, [CLAVE_DE_LA_PLANTILLA]),
    plantillas.porId,
  )
  const esAjena = (p: PlantillaDeArte) => p.autorId !== quien.yo

  const hacer: Record<ClaveDeAccionDeArte, (p: PlantillaDeArte) => void> = {
    abrir: (p) => {
      router.push(rutaDeLaPlantillaDeArte(p.id))
    },
    duplicar: (p) => void duplicar(p),
    'otro-formato': () => undefined,
    'usar-por-defecto': (p) => void porDefectoDe(p, true),
    'quitar-por-defecto': (p) => void porDefectoDe(p, false),
    'hacerla-de-la-empresa': (p) => void visibilidad.cambiar(p, 'empresa', true),
    // La de otra persona deja de verla quien la cambia: antes, confirmar.
    'hacerla-privada': (p) => {
      if (esAjena(p)) {
        confirmarPrivada.abrir(p.id)
      } else {
        void visibilidad.cambiar(p, 'privada', true)
      }
    },
    eliminar: (p) => {
      confirmarEliminar.abrir(p.id)
    },
  }
  const abreEncima = (clave: ClaveDeAccionDeArte, p: PlantillaDeArte) =>
    clave === 'eliminar' || (clave === 'hacerla-privada' && esAjena(p))

  return {
    menuDe: (plantilla: PlantillaDeArte): AccionDeMenu[] =>
      lineasDeLaPlantilla(quien, {
        ...plantilla,
        origenNombre: nombreDelOrigen(plantilla.origenId),
        esPorDefecto: esLaPorDefecto(porDefecto, plantilla) !== null,
      }).map((linea) =>
        linea.tipo === 'accion'
          ? {
              ...linea,
              alElegir: () => {
                hacer[linea.clave](plantilla)
              },
              ...(abreEncima(linea.clave, plantilla) ? { despuesDeCerrar: true } : {}),
            }
          : linea,
      ),
    esPorDefecto: (plantilla: PlantillaDeArte) => esLaPorDefecto(porDefecto, plantilla) !== null,
    nombreDelOrigen,
    confirmarEliminar,
    confirmarPrivada,
    eliminacion,
    visibilidad,
  }
}

export type AccionesDeLasPlantillas = ReturnType<typeof useAccionesDeLasPlantillas>
