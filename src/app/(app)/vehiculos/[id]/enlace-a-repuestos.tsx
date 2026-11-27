import type { Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { puede, requerirSesion, seOcultaEnElLive } from '@/modules/equipo'
import { proyectoDe, rutaDelProyecto } from '@/modules/repuestos'
import { ESTILO_DEL_ENLACE_CORTO } from './enlaces-cortos-estilo'

// «Repuestos · Proyecto #N» en la cabecera de la ficha: sólo con `repuestos.ver` (es global) y si el vehículo tiene proyecto. La lectura es la del
// bloque «Repuestos» (`proyectoDe`, con `cache()`: una fila por `repuestos_proyecto_por_vehiculo`). Sin proyecto o si falla, nada: el error lo dice el
// bloque de la derecha. Con el Modo Live, el proyecto está oculto (aun con «Sólo estadísticas»): ni se lee.
export async function EnlaceARepuestos({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'repuestos.ver') || seOcultaEnElLive(sesion.live, 'repuestos')) {
    return null
  }
  const leido = await proyectoDe(vehiculoId)
  if (!leido.ok || leido.data === null) {
    return null
  }
  return (
    <Link href={rutaDelProyecto(leido.data.id) as Route} className={ESTILO_DEL_ENLACE_CORTO}>
      Repuestos · Proyecto #{leido.data.numero}
    </Link>
  )
}
