import { puede } from '@/modules/equipo'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import { vinOLote } from '@/modules/vehiculos'
import { FichaCompletaDeLaUnidad } from '@/modules/vehiculos/pantallas/ficha-completa'
import type { Permisos } from '@/shared/lib/permisos'
import { vehiculoDeLaUnidad } from '../../vehiculo-de-la-unidad'

// «VIN X · Lote N» bajo el título de la cabecera, tras su `Suspense` (el renglón tiene alto fijo: no salta al llegar). Nada si el vehículo no tiene ninguno de los dos.
export async function IdentidadDeLaUnidad({ id }: { id: string }) {
  const vehiculo = await vehiculoDeLaUnidad(id)
  return vehiculo ? vinOLote(vehiculo) : null
}

// El toque que cubre la cabecera y abre la ficha completa del vehículo (`?ver=ficha`), con «Abrir en Vehículos» en el pie si la persona ve Vehículos en ese origen. Llega tras su
// `Suspense` con el vehículo, su origen y las categorías de su layout (las lee el modal de la ficha). Si el vehículo o su origen no se leen, la cabecera no es tocable: no se ofrece
// lo que no se puede abrir.
export async function FichaDeLaCabecera({ id, permisos }: { id: string; permisos: Permisos }) {
  const vehiculo = await vehiculoDeLaUnidad(id)
  if (!vehiculo) return null
  const origenes = await getOrigenes(true)
  const origen = origenes.ok ? origenes.data.find((uno) => uno.id === vehiculo.origenId) : undefined
  if (!origen) return null
  // Sin el layout, la ficha abre igual sin agrupar por categoría: la cabecera no cae por esa lectura.
  const layout = await leerLayout(origen.id, { conUso: false })
  return (
    <FichaCompletaDeLaUnidad
      vehiculo={vehiculo}
      origen={origen}
      categorias={layout.ok ? layout.data.categorias : []}
      abrirEnVehiculos={puede(permisos, 'vehiculos.ver', origen.id)}
    />
  )
}
