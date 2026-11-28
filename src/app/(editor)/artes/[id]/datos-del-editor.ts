// Lo que el editor de artes necesita además de la plantilla, leído una vez y en paralelo con la sesión de quien mira: el origen con los campos
// de su ficha (el catálogo de variables), el texto base del origen, el Mensaje del portal de `leads`, quien comparte y la empresa, y cómo deja el
// Modo Live ver a los clientes; y, con `puede()`, por qué no cambia cada texto ni elige un vehículo de ejemplo. Lo compone `src/app`: `artes`
// no importa `leads`, `vehiculos` ni `web` en el servidor. Una lectura que falla no tumba el editor (el texto base, el inicial de su tipo; el
// mensaje, sin versión: su editor lo dice).
import 'server-only'
import type { ComponentProps } from 'react'
import {
  leerTextoBase,
  MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL,
  motivoSinPermisoDelTextoBase,
  motivoSinVehiculosDeEjemplo,
} from '@/modules/artes'
import type { PantallaDelEditor } from '@/modules/artes/pantallas/artes-plantilla'
import { leerAjustesDeLeads } from '@/modules/leads'
import { leerLayout, type OrigenResumen } from '@/modules/origenes'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { leerFijosDelArte } from '../../../(app)/_arte/leer-fijos-del-arte'
import { liveDelCliente } from '../../../(app)/_arte/live-del-cliente'

type PropsDelEditor = ComponentProps<typeof PantallaDelEditor>

export type DatosDelEditor = Pick<
  PropsDelEditor,
  | 'origen'
  | 'textoBase'
  | 'motivoDelTextoBase'
  | 'portal'
  | 'motivoDelPortal'
  | 'fijos'
  | 'motivoDelEjemplo'
  | 'liveDelCliente'
>

const SIN_PORTAL = { mensaje: null, actualizadoEn: null }

export async function leerDatosDelEditor(
  origen: Pick<OrigenResumen, 'id' | 'nombre' | 'tipo'>,
  permisos: Permisos,
): Promise<DatosDelEditor> {
  const [textoBase, ajustes, fijos, layout, clientes] = await Promise.all([
    leerTextoBase(origen.id),
    leerAjustesDeLeads(),
    leerFijosDelArte(),
    leerLayout(origen.id, { conUso: false }),
    liveDelCliente(),
  ])
  const campos = layout.ok
    ? layout.data.campos.map(({ clave, etiqueta, activo }) => ({ clave, etiqueta, activo }))
    : []
  return {
    origen: { id: origen.id, nombre: origen.nombre, tipo: origen.tipo, campos },
    textoBase,
    motivoDelTextoBase: puede(permisos, 'cotizaciones.configurar', origen.id)
      ? null
      : motivoSinPermisoDelTextoBase(origen.nombre),
    portal: ajustes.ok
      ? { mensaje: ajustes.data.portal.mensaje, actualizadoEn: ajustes.data.portal.actualizadoEn }
      : SIN_PORTAL,
    motivoDelPortal: puede(permisos, 'leads.configurar') ? null : MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL,
    fijos,
    motivoDelEjemplo: puede(permisos, 'vehiculos.ver', origen.id)
      ? null
      : motivoSinVehiculosDeEjemplo(origen.nombre),
    liveDelCliente: clientes,
  }
}
