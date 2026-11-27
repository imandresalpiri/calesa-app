import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { CLAVE_DE_ENTIDAD, CLAVE_DE_REGISTRO, ENTIDADES_DE_LA_ACTIVIDAD } from '@/modules/actividad'
import { ActividadReciente } from '@/modules/actividad/pantallas/actividad-reciente'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Actividad reciente' }

// `docs/UX.md` › «Actividad»: si no se pueden leer los ajustes, la retención de fábrica.
const DIAS_POR_DEFECTO = 14

// La «Actividad reciente» de un registro sola (`?entidad=<tabla>&registro=<id>`): donde se ve y se prueba la pieza fuera de una ficha (ya la
// monta la ficha del vehículo). Sin `actividad.ver` la pieza no dibuja nada.
export default function PaginaDeActividadReciente({
  searchParams,
}: PageProps<'/actividad/reciente'>) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <h1 className="sr-only">Actividad reciente</h1>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Contenido({
  searchParams,
}: {
  searchParams: PageProps<'/actividad/reciente'>['searchParams']
}) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  await connection()
  const [sesion, parametros, ajustes] = await Promise.all([
    requerirSesion(),
    searchParams,
    leerAjustes(),
  ])
  const tabla = unParametro(parametros[CLAVE_DE_ENTIDAD]) ?? ''
  const registro = unParametro(parametros[CLAVE_DE_REGISTRO]) ?? ''
  if (!(tabla in ENTIDADES_DE_LA_ACTIVIDAD) || registro.trim() === '') {
    return <EstadoVacio titulo="Elige un registro para ver su actividad reciente." />
  }
  return (
    <ActividadReciente
      tabla={tabla}
      registroId={registro}
      permisos={sesion.permisos}
      zona={(ajustes.ok ? ajustes.data.ajustes.zonaHoraria : null) ?? ZONA_POR_DEFECTO}
      diasDeActividad={ajustes.ok ? ajustes.data.ajustes.actividadDias : DIAS_POR_DEFECTO}
    />
  )
}
