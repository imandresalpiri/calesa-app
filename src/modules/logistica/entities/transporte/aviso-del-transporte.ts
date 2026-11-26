import { conteoCorto } from '@/shared/lib/conteo'
import type { EntidadesDeLaUnidad, VehiculosDeLaEntidad } from './lectura-de-la-unidad'

// La línea sobre el formulario del hueco «Transporte» que avisa que un cambio no es sólo de esta unidad: lo del embarque (naviera, puertos y fechas) cambia para todos sus vehículos y el
// booking de un contenedor sin embarque, para todos los del contenedor. La línea tiene su alto reservado siempre (sin aviso queda vacía): nada salta al llegar.

// «los 3 vehículos de este embarque», «este vehículo y otros que no puedes ver» o nulo si va sola (los que no ve quien mira se dicen, nunca se nombran).
function aQuienes(v: VehiculosDeLaEntidad, de: string): string | null {
  const ocultos = v.hayOcultas ? ' y otros que no puedes ver' : ''
  if (v.n > 1 || v.hayMas) {
    return `los ${conteoCorto(v)} vehículos de ${de}${ocultos}`
  }
  return v.hayOcultas ? `este vehículo${ocultos}` : null
}

/** «Cambia para los N vehículos de este embarque.» (N hasta «100+»), lo mismo del booking de un contenedor sin embarque, o nulo si va sola. */
export function avisoDelTransporte(lectura: EntidadesDeLaUnidad | null): string | null {
  if (lectura?.embarque) {
    const quienes = aQuienes(lectura.embarque.vehiculos, 'este embarque')
    return quienes && `Cambia para ${quienes}.`
  }
  if (lectura?.contenedorDeLaUnidad) {
    const quienes = aQuienes(lectura.contenedorDeLaUnidad.vehiculos, 'este contenedor')
    return quienes && `El booking cambia para ${quienes}.`
  }
  return null
}
