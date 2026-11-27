import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  compararCotizaciones,
  idsParaComparar,
  leerParaComparar,
  veredictoDeComparar,
} from '@/modules/cotizaciones'
import { NoSeComparan, TablaDeComparar } from '@/modules/cotizaciones/pantallas/aprobada-comparar'
import { EsqueletoDeComparar } from '@/modules/cotizaciones/pantallas/aprobada-esqueleto-de-comparar'
import { requerirSesion } from '@/modules/equipo'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { origenesCon } from '@/shared/lib/permisos'
import { RUTAS, returnToSeguro, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Comparar cotizaciones' }

// «Comparar cotizaciones» (`docs/UX.md`): 2 o 3 cotizaciones del mismo vehículo lado a lado, lo guardado de cada una (su versión de la fórmula y sus valores, recortados
// al nivel de quien mira; sin recálculo), con lo distinto resaltado contra la primera y «Aprobar esta» al pie de cada columna. Se llega desde «De este vehículo». Pide
// sesión; que se vea cada una lo decide la base (`cotizacion_hoja_guardada`, el mismo 42501 para todo).
export default function PaginaComparar({ searchParams }: PageProps<'/cotizaciones/comparar'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
        Comparar cotizaciones
      </h1>
      <Suspense fallback={<EsqueletoDeComparar />}>
        <Comparar searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Comparar({
  searchParams,
}: {
  searchParams: PageProps<'/cotizaciones/comparar'>['searchParams']
}) {
  const oculto = await ocultoEnElLive('cotizaciones')
  if (oculto) {
    return oculto
  }
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const volverA = returnToSeguro(unParametro(parametros['returnTo'])) ?? RUTAS.cotizaciones
  const ids = idsParaComparar(unParametro(parametros['ids']))
  if (ids === null) {
    return <NoSeComparan volverA={volverA} />
  }
  const lectura = await leerParaComparar(ids)
  if (!lectura.ok) {
    // Sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
    throw new Error(lectura.error.mensaje)
  }
  const veredicto = veredictoDeComparar(lectura.data)
  if (veredicto.tipo === 'no_se_comparan') {
    return <NoSeComparan volverA={volverA} />
  }
  // El vehículo sólo se nombra si quien mira lo ve (nulo si no).
  const vehiculo = datosO(await leerVehiculo(veredicto.vehiculoId))
  const modelo = compararCotizaciones(lectura.data, veredicto.vehiculoId, vehiculo?.titulo ?? null)
  // Releer (un `router.refresh()` de «Reintentar») con otra versión de alguna u otra aprobada (aprobar no mueve la versión) reinicia la tabla con lo de la base.
  const clave = [
    ...modelo.columnas.map((c) =>
      c.tipo === 'cotizacion' ? `${c.id}:${c.actualizadoEn}` : `${c.id}:error`,
    ),
    `aprobada:${modelo.aprobadaId ?? ''}`,
  ].join('|')
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* El vehículo sólo se nombra si quien mira lo ve. */}
        {vehiculo === null ? null : (
          <p className="min-w-0 [overflow-wrap:anywhere] text-(--color-ink-soft)">
            {vehiculo.titulo}
          </p>
        )}
        <Link
          href={volverA as Route}
          className={buttonVariants({ variant: 'ghost', className: 'ms-auto min-h-11 md:min-h-9' })}
        >
          <ArrowLeftIcon aria-hidden />
          Volver
        </Link>
      </div>
      <TablaDeComparar
        key={clave}
        modelo={modelo}
        aprobarEn={origenesCon(sesion.permisos, 'cotizaciones.aprobar')}
      />
    </>
  )
}
