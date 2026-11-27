import 'server-only'
import { cache } from 'react'
import { leerVehiculo } from '@/modules/vehiculos'

// El vehículo de la unidad, una vez por petición: lo piden la portada, «VIN X · Lote N» y la ficha completa de la cabecera, cada una tras su `Suspense`. Nulo si no se lee o la RLS
// no lo deja ver: la cabecera sigue sin esos extras.
export const vehiculoDeLaUnidad = cache(async (id: string) => {
  const leido = await leerVehiculo(id)
  return leido.ok ? leido.data : null
})
