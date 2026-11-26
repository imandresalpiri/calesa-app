'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_SECCION, CLAVES_DEL_PANEL_DE_FASE } from '../../../entities/panel-del-flujo'

export const CLAVE_DE_FASE_ABIERTA = 'fase'
const PARAMETROS = {
  [CLAVE_DE_FASE_ABIERTA]: parseAsString,
  [CLAVE_DE_SECCION]: parseAsString,
  ...Object.fromEntries(CLAVES_DEL_PANEL_DE_FASE.map((clave) => [clave, parseAsString])),
}
// Lo que abría la fase o la sección anterior (un requisito en edición, una salida por quitar, un tipo de documento): se va al cambiar.
const LIMPIAS = Object.fromEntries(CLAVES_DEL_PANEL_DE_FASE.map((clave) => [clave, null]))

// Lo que se abre además de la fase, en el mismo paso del historial (la salida en edición, la confirmación de quitarla).
export type ExtrasDeLaFase = Partial<Record<(typeof CLAVES_DEL_PANEL_DE_FASE)[number], string>>

// Qué fase está abierta en el panel del flujo, en la URL (`?fase=<id>`): sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra),
// quita la sección del flujo que estuviera abierta (`?seccion=`) y lo que abría la fase anterior, y no pide nada al servidor (sin `shallow: false`: el panel
// se dibuja con el flujo ya leído). `texto` es la URL tal cual; quien dibuja decide si es de una fase del flujo (un id ajeno se ignora). Tras recargar con el
// panel abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`). `extras` abre algo de la fase en el mismo paso (`?editar=salida&editada=`).
export function useFaseAbierta() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_FASE_ABIERTA] ?? null
  useVueltaDelFoco(CLAVE_DE_FASE_ABIERTA, texto !== null)
  return {
    texto,
    abrir: (faseId: string, extras: ExtrasDeLaFase = {}) => {
      abrirConVuelta(
        CLAVE_DE_FASE_ABIERTA,
        () =>
          setParametros(
            { ...LIMPIAS, ...extras, [CLAVE_DE_SECCION]: null, [CLAVE_DE_FASE_ABIERTA]: faseId },
            { history: 'push' },
          ),
        texto === faseId && parametros[CLAVE_DE_SECCION] === null,
      )
    },
    cerrar: () => {
      void setParametros({ ...LIMPIAS, [CLAVE_DE_FASE_ABIERTA]: null })
    },
  }
}
