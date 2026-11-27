import { Suspense, type ReactNode } from 'react'
import { puede } from '@/modules/equipo'
import { opcionesDelFiltro } from '@/modules/logistica'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import {
  CadenaDeLaUnidadEnLaPagina,
  ProveedorDeLaCadena,
} from '@/modules/logistica/pantallas/mover-cadena'
import { PaginaDeLaUnidad } from '@/modules/logistica/pantallas/unidad-pagina'
import { EsqueletoDeLaFoto } from '@/modules/logistica/pantallas/unidad-esqueletos'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { RelacionadosDelVehiculoServidor } from '../../../_relacionados/relacionados-del-vehiculo'
import { BarraDeLaUnidad } from '../../barra-de-logistica'
import { FotoDeLaUnidad } from '../../foto-de-la-unidad'
import { TarjetasDeLaUnidad } from '../../tarjetas-de-la-unidad'
import { UnidadNoDisponible } from '../../unidad-abierta'
import { prepararUnidad, type CadenaPreparada } from '../../unidad-preparada'
import { FichaDeLaCabecera, IdentidadDeLaUnidad } from './cabecera-de-la-pagina'

// La unidad de logística en su propia página: la cabecera baja (portada, «VIN · Lote», la fase con su demora y «Relacionados»; tocarla abre la ficha completa), la cadena de
// fases y las tarjetas con «Qué falta» al costado. Registra el «visto» del contexto logística (el drawer de gastos no: ahí lo registra la lista). Lo que lee aparte (la portada, la
// identidad, la ficha, los relacionados y el resumen de cada tarjeta) llega tras su `Suspense`, con un esqueleto del mismo tamaño. Arriba, la barra de Logística con el origen del
// vehículo marcado (no se recuerda: entrar a un vehículo no es elegir un origen).
export async function UnidadEnSuPagina({ id, permisos }: { id: string; permisos: Permisos }) {
  const preparada = await prepararUnidad(id, permisos, { conCadena: true })
  if (preparada.tipo === 'no_disponible' || preparada.tipo === 'sin_permiso') {
    return (
      <>
        <BarraDeLaUnidad origenId={null} />
        {preparada.tipo === 'no_disponible' ? <UnidadNoDisponible /> : <EstadoSinPermiso />}
      </>
    )
  }
  const { unidad, origen, fase, huecos, aviso, cadena } = preparada
  const pasadas = pasadasLeidas(cadena)
  const pagina = (
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
        cabecera={{
          foto: (
            <Suspense fallback={<EsqueletoDeLaFoto />}>
              <FotoDeLaUnidad id={unidad.id} />
            </Suspense>
          ),
          identidad: (
            <Suspense fallback={null}>
              <IdentidadDeLaUnidad id={unidad.id} />
            </Suspense>
          ),
          ficha: (
            <Suspense fallback={null}>
              <FichaDeLaCabecera id={unidad.id} permisos={permisos} />
            </Suspense>
          ),
          relacionados: puede(permisos, 'leads.ver') ? (
            <Suspense fallback={<EsqueletoDeRelacionados presentacion="linea" />}>
              <RelacionadosDelVehiculoServidor
                vehiculoId={unidad.id}
                permisos={permisos}
                lugar="logistica"
                presentacion="linea"
              />
            </Suspense>
          ) : null,
          demora: cadena?.demora ?? null,
        }}
        cadena={cadena ? <CadenaDeLaUnidadEnLaPagina cadena={cadena.cadena} /> : null}
        tarjetas={
          <TarjetasDeLaUnidad
            unidad={unidad}
            permisos={permisos}
            huecos={huecos}
            pasadas={pasadas}
          />
        }
      />
    </>
  )
  return (
    <ConLaCadena unidadId={unidad.id} cadena={cadena}>
      {pagina}
    </ConLaCadena>
  )
}

const pasadasLeidas = (cadena: CadenaPreparada | null) =>
  cadena && !cadena.cadena.sinPasadas ? cadena.pasadas : null

// Sin cadena (no se leyó la unidad para ella) «Qué falta», las tarjetas y el Historial se comportan como en un drawer: sin fase vista, avisos ni filtros. Las opciones del filtro
// del Historial salen de las pasadas que ya leyó la cadena.
function ConLaCadena({
  unidadId,
  cadena,
  children,
}: {
  unidadId: string
  cadena: CadenaPreparada | null
  children: ReactNode
}) {
  if (!cadena) return children
  const pasadas = pasadasLeidas(cadena)
  return (
    <ProveedorDeLaCadena
      unidadId={unidadId}
      cadena={cadena.cadena}
      opcionesDelHistorial={pasadas ? opcionesDelFiltro(pasadas) : null}
    >
      {children}
    </ProveedorDeLaCadena>
  )
}
