// Los paneles de `/configuracion/leads` (`?panel=`): una tarjeta, un panel, con la clave de la tarjeta.
import { PANEL_RESTABLECER_EMBUDO, PANEL_RESTABLECER_PORTAL } from './ajustes-de-leads'
import { PANEL_EDITAR_ORIGEN, PANEL_ELIMINAR_ORIGEN, PANEL_NUEVO_ORIGEN } from './origen-de-lead'
import { PANEL_EDITAR_TIPO, PANEL_ELIMINAR_TIPO, PANEL_NUEVO_TIPO } from './tipo-de-lead'
import {
  PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
  PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO,
  PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
} from './tipo-de-seguimiento'

export const PANEL_DE_TIPOS = 'tipos'
export const PANEL_DE_ORIGENES = 'origenes'
export const PANEL_DE_SEGUIMIENTOS = 'seguimientos'
export const PANEL_DEL_EMBUDO = 'embudo'
export const PANEL_DEL_PORTAL = 'portal'
export const PANEL_DE_TELEFONOS = 'telefonos'
// La lista de «Números repetidos»: un modal aparte, que abre la tarjeta de Teléfonos extra.
export const PANEL_DE_NUMEROS_REPETIDOS = 'numeros-repetidos'

export const CLAVES_DE_LAS_FAMILIAS = [
  'tipos',
  'origenes',
  'seguimientos',
  'embudo',
  'portal',
  'telefonos',
] as const
export type ClaveDeFamilia = (typeof CLAVES_DE_LAS_FAMILIAS)[number]

// La familia de una tarjeta: su panel (el de la lista o el editor) y los que salen de él (uno de un ítem, uno de restablecer). Dentro de una
// familia hay un solo modal abierto a la vez: el del ítem reemplaza al de la lista, y al cerrarse vuelve a ella.
export type FamiliaDeLaConfiguracion = {
  // El `?panel=` de la tarjeta, el que abre «Editar».
  principal: string
  paneles: readonly string[]
}

export const FAMILIAS_DE_LA_CONFIGURACION: Readonly<
  Record<ClaveDeFamilia, FamiliaDeLaConfiguracion>
> = {
  tipos: {
    principal: PANEL_DE_TIPOS,
    paneles: [PANEL_DE_TIPOS, PANEL_NUEVO_TIPO, PANEL_EDITAR_TIPO, PANEL_ELIMINAR_TIPO],
  },
  origenes: {
    principal: PANEL_DE_ORIGENES,
    paneles: [PANEL_DE_ORIGENES, PANEL_NUEVO_ORIGEN, PANEL_EDITAR_ORIGEN, PANEL_ELIMINAR_ORIGEN],
  },
  seguimientos: {
    principal: PANEL_DE_SEGUIMIENTOS,
    paneles: [
      PANEL_DE_SEGUIMIENTOS,
      PANEL_NUEVO_TIPO_DE_SEGUIMIENTO,
      PANEL_EDITAR_TIPO_DE_SEGUIMIENTO,
      PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO,
    ],
  },
  embudo: { principal: PANEL_DEL_EMBUDO, paneles: [PANEL_DEL_EMBUDO, PANEL_RESTABLECER_EMBUDO] },
  portal: { principal: PANEL_DEL_PORTAL, paneles: [PANEL_DEL_PORTAL, PANEL_RESTABLECER_PORTAL] },
  telefonos: { principal: PANEL_DE_TELEFONOS, paneles: [PANEL_DE_TELEFONOS] },
}
