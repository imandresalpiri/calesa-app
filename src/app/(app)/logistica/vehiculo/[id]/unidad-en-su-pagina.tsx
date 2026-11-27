import { Suspense } from 'react'
import { puede } from '@/modules/equipo'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import { PaginaDeLaUnidad } from '@/modules/logistica/pantallas/unidad-pagina'
import { EsqueletoDeLaFoto } from '@/modules/logistica/pantallas/unidad-esqueletos'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { RelacionadosDelVehiculoServidor } from '../../../_relacionados/relacionados-del-vehiculo'
import { BarraDeLaUnidad } from '../../barra-de-logistica'
import { FotoDeLaUnidad } from '../../foto-de-la-unidad'
import { UnidadNoDisponible } from '../../unidad-abierta'
import { prepararUnidad } from '../../unidad-preparada'

// La unidad de logística en su propia página (T20): la cabecera compacta con la portada y «Relacionados» en una línea, y las zonas (escritorio) o los bloques con la barra «Mover» (celular). Registra el «visto»
// del contexto logística (el drawer de gastos no: ahí lo registra la lista). La portada y los relacionados llegan tras su `Suspense`, con un esqueleto del mismo tamaño.
// Arriba, la barra de Logística con el origen del vehículo marcado (no se recuerda: entrar a un vehículo no es elegir un origen).
export async function UnidadEnSuPagina({
  id,
  permisos,
  huecoAbierto,
}: {
  id: string
  permisos: Permisos
  // `?hueco=documentos`: la pestaña que un enlace (la bandeja del día) pide ver; en el celular, el bloque abierto. Una clave desconocida se ignora.
  huecoAbierto?: string
}) {
  const preparada = await prepararUnidad(id, permisos, huecoAbierto)
  if (preparada.tipo === 'no_disponible' || preparada.tipo === 'sin_permiso') {
    return (
      <>
        <BarraDeLaUnidad origenId={null} />
        {preparada.tipo === 'no_disponible' ? <UnidadNoDisponible /> : <EstadoSinPermiso />}
      </>
    )
  }
  const { unidad, origen, fase, huecos, aviso } = preparada
  const esVehiculo = unidad.tipo === 'vehiculo'
  return (
    <>
      <BarraDeLaUnidad origenId={unidad.origenId} />
      <RegistrarVisto modulo="logistica" tipo="vehiculo" id={unidad.id} />
      <PaginaDeLaUnidad
        unidad={unidad}
        origen={origen}
        fase={fase}
        huecos={huecos}
        aviso={aviso}
        puedeMover={
          puede(permisos, 'flujos.mover', unidad.origenId) ||
          puede(permisos, 'flujos.mover.cualquiera', unidad.origenId)
        }
        foto={
          esVehiculo ? (
            <Suspense fallback={<EsqueletoDeLaFoto />}>
              <FotoDeLaUnidad id={unidad.id} />
            </Suspense>
          ) : null
        }
        relacionados={
          esVehiculo && puede(permisos, 'leads.ver') ? (
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
    </>
  )
}
