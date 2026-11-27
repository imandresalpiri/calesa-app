import 'server-only'
import {
  resumenDeLasEsperas,
  type ResumenDeLaTarjetaDeEsperas,
} from '../../entities/flujo/tarjeta-de-esperas'
import { proyectoDe } from '../proyectos/resumen'
import { esperasQueDestraban } from './esperas'

// El resumen de la tarjeta «Repuestos» de la página de la unidad (lo compone `src/app/(app)/logistica/`): las esperas (`repuestos_pendientes_de_vehiculo`, tope 50) y el proyecto vivo
// del vehículo (`proyectoDe`, con `cache()`), en paralelo y con la sesión de quien mira. Un fallo de las esperas lo dice en su línea; uno del proyecto sólo apaga «empezar».
export async function leerResumenDeLasEsperas(
  vehiculoId: string,
  { puedeEditar }: { puedeEditar: boolean },
): Promise<ResumenDeLaTarjetaDeEsperas> {
  const [esperas, proyecto] = await Promise.all([
    esperasQueDestraban(vehiculoId),
    proyectoDe(vehiculoId),
  ])
  return resumenDeLasEsperas({
    esperas: esperas.ok ? esperas.data : null,
    vehiculoId,
    proyecto: proyecto.ok ? proyecto.data : null,
    puedeEditar: puedeEditar && proyecto.ok,
  })
}
