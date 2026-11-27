import 'server-only'
import {
  accionDeEmpezar,
  esperasQueDestraban,
  proyectoDe,
  resumenDeLasEsperas,
  type ResumenDeLaTarjetaDeEsperas,
} from '@/modules/repuestos'

// El resumen de la tarjeta «Repuestos» de la página de la unidad: las esperas del vehículo (área `flujo` de `repuestos`, tope 50) y su proyecto vivo (área `proyectos`, con
// `cache()`), en paralelo y con la sesión de quien mira. Las une `src/app` porque en `repuestos` un área no importa otra. Un fallo de las esperas lo dice en su línea; uno del
// proyecto sólo apaga «empezar».
export async function leerResumenDeRepuestos(
  vehiculoId: string,
  { puedeEditar }: { puedeEditar: boolean },
): Promise<ResumenDeLaTarjetaDeEsperas> {
  const [esperas, proyecto] = await Promise.all([
    esperasQueDestraban(vehiculoId),
    proyectoDe(vehiculoId),
  ])
  return resumenDeLasEsperas({
    esperas: esperas.ok ? esperas.data : null,
    empezar: accionDeEmpezar({
      vehiculoId,
      proyecto: proyecto.ok ? proyecto.data : null,
      puedeEditar: puedeEditar && proyecto.ok,
    }),
  })
}
