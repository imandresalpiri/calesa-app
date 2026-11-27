'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_ACCION } from '../../../entities/panel-del-flujo'
import { ACCION_EDITAR_TIPO, CLAVE_DEL_TIPO } from '../../../entities/documentos/tipo-de-documento'

const PARAMETROS = {
  [CLAVE_DE_ACCION]: parseAsString,
  [CLAVE_DEL_TIPO]: parseAsString,
}

// «Editar» un tipo de documento, en la URL: `?accion=editar-tipo&tipo=<id>`, dentro del drawer de los tipos (`?panel=tipos-de-documento`). Abrir suma
// al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`); cerrar quita las dos claves y deja el
// drawer. Sin `shallow: false`: los dos grupos ya están en el drawer. «Nuevo» lo abre `useTipoCreado()` del núcleo.
export function usePanelDeTipo() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  // `?accion=editar-tipo` sin su id también es una edición (que no abre): se revisa al abrir.
  const hayEdicion = url[CLAVE_DE_ACCION] === ACCION_EDITAR_TIPO
  const editando = hayEdicion ? url[CLAVE_DEL_TIPO] : null
  useVueltaDelFoco(CLAVE_DE_ACCION, hayEdicion)
  return {
    editando,
    hayEdicion,
    // Con la edición de otro abierta, marca otra vez: «ya abierto» mira el id.
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_ACCION,
        () =>
          setUrl(
            { [CLAVE_DE_ACCION]: ACCION_EDITAR_TIPO, [CLAVE_DEL_TIPO]: id },
            { history: 'push', scroll: false },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_ACCION]: null, [CLAVE_DEL_TIPO]: null }, { scroll: false })
    },
  }
}
