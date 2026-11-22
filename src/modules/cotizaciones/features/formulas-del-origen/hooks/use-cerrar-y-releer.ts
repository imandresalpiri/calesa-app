'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import {
  CLAVE_DE_LA_COPIA,
  CLAVE_DE_LA_FORMULA_DEL_PANEL,
} from '../../../entities/formulas-del-origen/rutas'

const CLAVES = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_LA_FORMULA_DEL_PANEL]: parseAsString,
  [CLAVE_DE_LA_COPIA]: parseAsString,
}

const SIN_PANEL = {
  [CLAVE_DE_PANEL]: null,
  [CLAVE_DE_LA_FORMULA_DEL_PANEL]: null,
  [CLAVE_DE_LA_COPIA]: null,
}

// Tras entrar un panel de una fórmula del origen: cierra el panel y vuelve a leer la pantalla en **una** navegación, la URL sin las claves del panel
// con `shallow: false`. Cerrar por la URL y `router.refresh()` juntos compiten (nuqs escribe un tick después y uno de los dos se pierde: el diálogo
// queda abierto o la lista sin releer), y `router.replace()` a la misma ruta puede servirse de la caché del router sin ir al servidor
// (docs/LECCIONES.md › «Server Actions, Next y React»). Sirve en la lista y en la cabeza del editor.
export function useCerrarYReleer(): () => void {
  const [, escribir] = useQueryStates(CLAVES)
  return () => {
    void escribir(SIN_PANEL, { shallow: false, scroll: false })
  }
}
