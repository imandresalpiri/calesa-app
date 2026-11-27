import type { Route } from 'next'
import Link from 'next/link'
import { puede } from '@/modules/equipo'
import { PanelDeLaUnidad } from '@/modules/logistica/pantallas/unidad'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import { Suspense } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { RelacionadosDelVehiculoServidor } from '../_relacionados/relacionados-del-vehiculo'
import { prepararUnidad } from './unidad-preparada'

// Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe.
export function UnidadNoDisponible() {
  return (
    <EstadoVacio
      titulo="Este vehículo ya no está disponible"
      descripcion="No existe o ya no tienes acceso."
      accion={
        <Link href={RUTAS.logistica as Route} className={buttonVariants({ variant: 'outline' })}>
          Ir a Logística
        </Link>
      }
    />
  )
}

// La unidad con ese id y su panel de bloques, o el estado que toque (6.01): el drawer de gastos y pagos. La página de la unidad usa `PaginaDeLaUnidad` (`vehiculo/[id]/unidad-en-su-pagina.tsx`) con la misma `prepararUnidad`. Exige las dos cosas (D3): la fila bajo la
// RLS de `vehiculos` (`vehiculos.ver`) y `logistica.ver` en el origen de la unidad. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar»; el del flujo del
// origen no tumba el panel: deja apagados los huecos que piden una regla y lo dice.
export async function UnidadAbierta({ id, permisos }: { id: string; permisos: Permisos }) {
  const preparada = await prepararUnidad(id, permisos)
  if (preparada.tipo === 'no_disponible') {
    return <UnidadNoDisponible />
  }
  if (preparada.tipo === 'sin_permiso') {
    return <EstadoSinPermiso />
  }
  const { unidad, origen, fase, huecos, aviso } = preparada
  return (
    <PanelDeLaUnidad
      unidad={unidad}
      origen={origen}
      fase={fase}
      huecos={huecos}
      aviso={aviso}
      // Los relacionados de un vehículo (no de un ítem de repuesto), bajo la cabecera, en una línea de chips como en los drawers. La confirmación de desvincular y los selectores de leads
      // son de la ficha: acá llevan a ella.
      relacionados={
        unidad.tipo === 'vehiculo' && puede(permisos, 'leads.ver') ? (
          <Suspense fallback={<EsqueletoDeRelacionados presentacion="linea" />}>
            <RelacionadosDelVehiculoServidor
              vehiculoId={unidad.id}
              permisos={permisos}
              lugar="logistica"
              presentacion="linea"
            />
          </Suspense>
        ) : null
      }
    />
  )
}
