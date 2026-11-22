'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DATOS_DEL_ORIGEN } from '../../../../entities/origen'

// «Datos» del origen abierto, en la URL (`?panel=datos`): lo abren el botón de la cabecera y, en el celular, la primera línea del «⋯».
export function usePanelDeDatos() {
  return usePanelPorUrl(PANEL_DATOS_DEL_ORIGEN)
}
