import { conteoCorto } from '@/shared/lib/conteo'
import type { EntidadesDeLaUnidad, VehiculosDeLaEntidad } from './lectura-de-la-unidad'

// La línea de «Dónde viaja» en el hueco «Transporte» que avisa que lo del embarque (naviera, puertos y fechas, que se cambian en «Editar el embarque») no es sólo de esta unidad: cambia
// para todos sus vehículos. La línea tiene su alto reservado siempre (sin aviso queda vacía): nada salta al llegar.

// «los 3 vehículos de este embarque», «este vehículo y otros que no puedes ver» o nulo si va sola (los que no ve quien mira se dicen, nunca se nombran).
function aQuienes(v: VehiculosDeLaEntidad, de: string): string | null {
  const ocultos = v.hayOcultas ? ' y otros que no puedes ver' : ''
  if (v.n > 1 || v.hayMas) {
    return `los ${conteoCorto(v)} vehículos de ${de}${ocultos}`
  }
  return v.hayOcultas ? `este vehículo${ocultos}` : null
}

/** «Cambia para los N vehículos de este embarque.» (N hasta «100+»); nulo sin embarque o si va sola en él. */
export function avisoDelTransporte(lectura: EntidadesDeLaUnidad | null): string | null {
  if (lectura?.embarque) {
    const quienes = aQuienes(lectura.embarque.vehiculos, 'este embarque')
    return quienes && `Cambia para ${quienes}.`
  }
  return null
}
