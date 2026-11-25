import { z } from 'zod'
import { camposQueCasanLaAyuda, type HojaLista } from '@/modules/cotizaciones'
import { integracionActiva } from '@/modules/empresa'
import type { OrigenResumen } from '@/modules/origenes'
import {
  editablesDe,
  leerVehiculo,
  permisoDeAlta,
  valoresParaCasar,
  type Vehiculo,
} from '@/modules/vehiculos'
import type { AltaDelPanel } from '@/modules/vehiculos/pantallas/cotizar'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

// Lo del vehículo que leen las dos hojas (servidor): la de cotizar (`nuevo/`) y la de una guardada (`[id]/`, para cambiar el vehículo de una preventa: T315). Un archivo
// aparte de cada `page.tsx` (una responsabilidad: la composición).

export type Quien = { permisos: Permisos; usuarioId: string }

const esId = z.guid()
// Lo que la URL trae como id (`?vehiculo=`, `?lead=`) y no lo es se ignora.
export const idDeUrl = (valor: string | string[] | undefined): string | null => {
  const leido = esId.safeParse(unParametro(valor))
  return leido.success ? leido.data : null
}

// El vehículo de la URL, con si quien mira lo puede editar (en serie: `editablesDe` necesita el vehículo leído; casi siempre sin ir a la base); null si no vino, no existe o
// no se ve.
export async function elegidoDeLaUrl(quien: Quien, id: string | null) {
  if (id === null) {
    return null
  }
  const leido = await leerVehiculo(id)
  if (!leido.ok || !leido.data) {
    return null
  }
  const editables = await editablesDe(quien, [leido.data])
  return { vehiculo: leido.data, editable: editables.has(leido.data.id) }
}

export type VehiculoDeLaUrl = Awaited<ReturnType<typeof elegidoDeLaUrl>>

// Lo que el panel del vehículo necesita para dar de alta desde él: sólo si quien mira ve los vehículos del origen y puede crearlos en él (un origen inactivo no da de alta: el
// de la hoja nueva lo está siempre; el de una guardada, puede que no). Se lee a la vez que la hoja. El layout del origen no viaja: el alta lo lee desde el navegador al abrirse (P2 del 4.14-2c).
export async function altaDelPanelDe(
  permisos: Permisos,
  origen: OrigenResumen,
): Promise<AltaDelPanel | null> {
  if (
    !puede(permisos, 'vehiculos.ver', origen.id) ||
    permisoDeAlta(permisos, origen, 'cotizar').estado !== 'habilitado'
  ) {
    return null
  }
  const activa = origen.tipo === 'subasta' ? await integracionActiva('apibara') : false
  return {
    origen,
    apibara: { activa, puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar') },
  }
}

// Los datos del vehículo con que la ayuda de la hoja resalta «Tu vehículo»: sólo los campos que casa alguna de sus tablas (`camposQueCasanLaAyuda`), como los lee el
// motor. Sin un vehículo que quien mira ve, nada: ninguna fila es la suya.
export const valoresDelVehiculoDe = (
  hoja: Pick<HojaLista, 'secciones'>,
  vehiculo: Vehiculo | null,
): Readonly<Record<string, number | string>> | undefined =>
  vehiculo === null ? undefined : valoresParaCasar(vehiculo, camposQueCasanLaAyuda(hoja))
