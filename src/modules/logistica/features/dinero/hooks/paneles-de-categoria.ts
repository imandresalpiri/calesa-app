import {
  ACCION_EDITAR_CATEGORIA,
  ACCION_NUEVA_CATEGORIA,
  CLAVE_DE_CATEGORIA,
} from '../../../entities/dinero/paneles'
import { panelesDelCatalogo } from '../../nucleo/hooks/paneles-del-catalogo'

// Las claves de URL del modal de «Categorías de gasto» dentro de su drawer (6.11-4).
export const PANELES_DE_CATEGORIA = panelesDelCatalogo(
  ACCION_NUEVA_CATEGORIA,
  ACCION_EDITAR_CATEGORIA,
  CLAVE_DE_CATEGORIA,
)
