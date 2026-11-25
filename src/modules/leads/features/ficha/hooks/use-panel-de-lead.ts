'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_PARA } from '../../../entities/acciones-de-fila'
import { PANEL_COMPARTIR, PANEL_SALIR, PANEL_TRANSFERIR } from '../../../entities/cartera'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_CAMBIAR_TELEFONO } from '../../../entities/telefonos'

const PANELES = new Set([
  PANEL_EDITAR_LEAD,
  PANEL_CAMBIAR_TELEFONO,
  PANEL_COMPARTIR,
  PANEL_TRANSFERIR,
  PANEL_SALIR,
])

// Qué panel de la ficha está abierto, en la URL (`?panel=editar-lead`, `cambiar-telefono`, `compartir-lead`, `transferir-lead` o
// `salir-lead`). Comparten la clave: no pueden estar
// abiertos a la vez. Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`).
// Sin `shallow: false`: abrirlo no necesita al servidor, la ficha ya está. Cerrar quita también `para` (el lead del panel de edición abierto
// desde el «⋯» de la lista o del kanban: `useEdicionDesdeLaLista()`).
const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_PARA]: parseAsString }

export function usePanelDeLead() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const panel = parametros[CLAVE_DE_PANEL]
  const setPanel = (valor: string | null, opciones?: { history: 'push' | 'replace' }) =>
    setParametros({ [CLAVE_DE_PANEL]: valor }, opciones)
  useVueltaDelFoco(CLAVE_DE_PANEL, panel !== null && PANELES.has(panel))
  const abre = (valor: string) => () => {
    recordarQuienAbre()
    abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(valor, { history: 'push' }), panel === valor)
  }
  const cierra = () => {
    void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_PARA]: null })
  }
  return {
    // La edición de la ficha.
    abierto: panel === PANEL_EDITAR_LEAD,
    abrir: abre(PANEL_EDITAR_LEAD),
    cerrar: cierra,
    // El cambio del teléfono principal: se llega desde el panel de edición, que reemplaza su entrada del historial («atrás» no vuelve
    // a la edición con lo escrito ya descartado).
    telefono: {
      abierto: panel === PANEL_CAMBIAR_TELEFONO,
      reemplazar: () => {
        void setPanel(PANEL_CAMBIAR_TELEFONO, { history: 'replace' })
      },
      cerrar: cierra,
    },
    // Dar el lead a otra persona, o pasárselo.
    compartir: { abierto: panel === PANEL_COMPARTIR, abrir: abre(PANEL_COMPARTIR), cerrar: cierra },
    transferir: {
      abierto: panel === PANEL_TRANSFERIR,
      abrir: abre(PANEL_TRANSFERIR),
      cerrar: cierra,
    },
    // «Salir de este lead»: la confirmación.
    salir: { abierto: panel === PANEL_SALIR, abrir: abre(PANEL_SALIR), cerrar: cierra },
    // Alguno abierto: con uno la ficha no se vuelve a leer sola (reiniciaría lo escrito). Cualquier
    // `?panel=` cuenta, también los de otras secciones (un recordatorio, una oportunidad).
    hayPanel: panel !== null,
  }
}
