'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { loteDelContenedor } from '@/shared/lib/rutas'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  accionesDelContenedor,
  accionesDelEmbarque,
  huecoDeLaAccion,
  type AccionDeEmbarques,
} from '../../../entities/transporte/acciones-de-embarques'
import {
  PANEL_AGREGAR_CONTENEDOR,
  PANEL_AGREGAR_VEHICULOS,
  PANEL_EDITAR_CONTENEDOR,
  PANEL_EDITAR_EMBARQUE,
  panelDelHueco,
} from '../../../entities/transporte/paneles'
import { usePanelDeEmbarques } from './use-panel-de-embarques'

export type HuecoParaElMenu = { clave: string; titulo: string }

const comoMenu = (lista: AccionDeEmbarques[], alElegir: (clave: string) => void): AccionDeMenu[] =>
  lista.map((a) => ({
    tipo: 'accion',
    clave: a.clave,
    etiqueta: a.etiqueta,
    alElegir: () => alElegir(a.clave),
  }))

// El «⋯» de la cabecera de un embarque: lo que abre va en `?panel=` sobre la página (sin contenedor: el destino es el embarque).
export function useMenuDelEmbarque(puedeEditar: boolean, huecos: readonly HuecoParaElMenu[]) {
  const paneles = usePanelDeEmbarques()
  const panelDe: Record<string, string> = {
    editar: PANEL_EDITAR_EMBARQUE,
    'agregar-contenedor': PANEL_AGREGAR_CONTENEDOR,
    'agregar-vehiculos': PANEL_AGREGAR_VEHICULOS,
  }
  return comoMenu(accionesDelEmbarque(puedeEditar, huecos), (clave) => {
    const hueco = huecoDeLaAccion(clave)
    const panel = hueco === null ? panelDe[clave] : panelDelHueco(hueco)
    if (panel !== undefined) paneles.abrir(panel, null)
  })
}

// El «⋯» de un contenedor (su sección en la página del embarque o su drawer). Lo que abre sobre él va con `?contenedor=`: se abre sobre su drawer y al cerrarlo se vuelve a él.
// «Mover el contenedor» lleva al lote de la Cadena.
export function useMenuDelContenedor(args: {
  id: string
  origenId: string
  puedeEditar: boolean
  puedeMover: boolean
  enElDrawer: boolean
  huecos: readonly HuecoParaElMenu[]
}) {
  const router = useRouter()
  const paneles = usePanelDeEmbarques()
  return comoMenu(accionesDelContenedor(args), (clave) => {
    const hueco = huecoDeLaAccion(clave)
    if (hueco !== null) {
      paneles.abrir(panelDelHueco(hueco), args.id)
    } else if (clave === 'abrir') {
      paneles.abrirContenedor(args.id)
    } else if (clave === 'editar') {
      paneles.abrir(PANEL_EDITAR_CONTENEDOR, args.id)
    } else if (clave === 'agregar-vehiculos') {
      paneles.abrir(PANEL_AGREGAR_VEHICULOS, args.id)
    } else if (clave === 'mover') {
      router.push(loteDelContenedor(args.id, args.origenId) as Route)
    }
  })
}
