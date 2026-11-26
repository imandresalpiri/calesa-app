'use client'

import { useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DEL_PARA,
  paraDe,
  type ParaDelCatalogo,
} from '../../../entities/nucleo/catalogo-del-origen'
import { CLAVE_DE_ACCION, type PanelesDelCatalogo } from './paneles-del-catalogo'

// El modal de una fila del catálogo en la URL, dentro de su drawer: `?accion=nuevo-puerto&de=origen|compartido` o `?accion=editar-puerto&puerto=<id>` (y
// los de naviera y categoría). Abrir suma al historial («atrás» lo cierra); cerrar quita las tres claves y deja el drawer.
export function usePanelDelCatalogo({
  nuevo: ACCION_NUEVO,
  editar: ACCION_EDITAR,
  clave,
  parametros,
}: PanelesDelCatalogo) {
  const [url, setUrl] = useQueryStates(parametros)
  const accion = url[CLAVE_DE_ACCION] ?? null
  const nuevo = accion === ACCION_NUEVO
  const hayEdicion = accion === ACCION_EDITAR
  const editando = hayEdicion ? (url[clave] ?? null) : null
  useVueltaDelFoco(CLAVE_DE_ACCION, nuevo || hayEdicion)
  return {
    nuevo,
    hayEdicion,
    editando,
    para: paraDe(url[CLAVE_DEL_PARA] ?? null),
    abrirNuevo: (de: ParaDelCatalogo = 'origen') => {
      abrirConVuelta(
        CLAVE_DE_ACCION,
        () =>
          setUrl(
            { [CLAVE_DE_ACCION]: ACCION_NUEVO, [CLAVE_DEL_PARA]: de, [clave]: null },
            { history: 'push', scroll: false },
          ),
        nuevo,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_ACCION,
        () =>
          setUrl(
            { [CLAVE_DE_ACCION]: ACCION_EDITAR, [CLAVE_DEL_PARA]: null, [clave]: id },
            { history: 'push', scroll: false },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl(
        { [CLAVE_DE_ACCION]: null, [CLAVE_DEL_PARA]: null, [clave]: null },
        { scroll: false },
      )
    },
  }
}
