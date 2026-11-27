import { FotosEnElLugar } from '@/modules/vehiculos/pantallas/unidad-de-logistica'
import { vehiculoDeLaUnidad } from './vehiculo-de-la-unidad'

// La portada de la cabecera de la unidad: una fila por su PK, tras su `Suspense` (la cabecera no espera por ella). Si no se lee, la cabecera sigue sin foto. Del mismo tamaño que su esqueleto (4:3, 5 rem).
export async function FotoDeLaUnidad({ id }: { id: string }) {
  const vehiculo = await vehiculoDeLaUnidad(id)
  if (!vehiculo) return null
  return (
    <FotosEnElLugar
      vehiculo={{ id: vehiculo.id, titulo: vehiculo.titulo, portadaRuta: vehiculo.portadaRuta }}
      className="w-20 shrink-0"
    />
  )
}
