// Composición del área `aprobada` de `cotizaciones` en el servidor. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeAprobada } from '../../entities/aprobada/repositorio'
import { aprobadaSupabase } from '../../infra/aprobada/aprobar'
import {
  getAprobadasDeCotizaciones,
  getAprobadasDeVehiculos,
  getMarcaDeLaGuardada,
} from '../../infra/aprobada/leer'
import { getPaginaDeEsteVehiculo } from '../../infra/aprobada/de-este-vehiculo'
import { getOtrasDelVehiculo } from '../../infra/aprobada/otras-del-vehiculo'
import { getParaComparar } from '../../infra/aprobada/para-comparar'

// Aprobar una cotización. La action de `features/aprobada/` lo usa; sale por la raíz sólo por el nombre.
export const repositorioDeAprobada: RepositorioDeAprobada = aprobadaSupabase

// Las lecturas por página (la lista de vehículos, el listado) y la de la guardada.
export const leerAprobadasDeVehiculos = getAprobadasDeVehiculos
export const leerAprobadasDeCotizaciones = getAprobadasDeCotizaciones
export const leerMarcaDeLaGuardada = getMarcaDeLaGuardada

// Cuántas otras cotizaciones del vehículo ve quien mira (la línea y el bloque «De este vehículo» de la guardada).
export const leerOtrasDelVehiculo = getOtrasDelVehiculo

// Una página de «De este vehículo» desde el servidor (la del navegador es `de-este-vehiculo.client.ts`): las cotizaciones del vehículo de ejemplo del
// editor de artes (`GET /artes/ejemplo/vehiculos/<id>/cotizaciones`, en `src/app`). El cursor, opaco.
export const leerPaginaDeEsteVehiculo = getPaginaDeEsteVehiculo

// «Comparar cotizaciones»: la hoja guardada de cada una (sin recálculo) y sus marcas, en paralelo.
export const leerParaComparar = getParaComparar
