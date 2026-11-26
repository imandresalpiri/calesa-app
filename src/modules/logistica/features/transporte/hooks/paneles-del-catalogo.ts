import {
  ACCION_EDITAR_NAVIERA,
  ACCION_EDITAR_PUERTO,
  ACCION_NUEVA_NAVIERA,
  ACCION_NUEVO_PUERTO,
  CLAVE_DE_NAVIERA,
  CLAVE_DE_PUERTO,
} from '../../../entities/transporte/catalogo'
import { panelesDelCatalogo } from '../../nucleo/hooks/paneles-del-catalogo'

// Las claves de URL del modal de «Puertos» y «Navieras» dentro de su drawer (6.08-1).
export const PANELES_DE_PUERTO = panelesDelCatalogo(
  ACCION_NUEVO_PUERTO,
  ACCION_EDITAR_PUERTO,
  CLAVE_DE_PUERTO,
)

export const PANELES_DE_NAVIERA = panelesDelCatalogo(
  ACCION_NUEVA_NAVIERA,
  ACCION_EDITAR_NAVIERA,
  CLAVE_DE_NAVIERA,
)
