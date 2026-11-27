import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { CLAVE_DEL_CONTENEDOR_ABIERTO, CLAVE_DE_FALTA, VALOR_DE_FALTA } from '@/modules/logistica'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { unParametro } from '@/shared/lib/rutas'
import { EmbarqueEnSuPagina } from './embarque-en-su-pagina'

export const metadata: Metadata = { title: 'Embarque' }

// Un embarque en su propia página (`docs/UX.md` › «Logística»): qué es, en qué estado está, sus contenedores con sus vehículos y los sueltos. A ella llevan la fila de la lista, el drawer de un
// contenedor y la actividad. Con `?falta=1`, sólo los vehículos con algo que falta; con `?contenedor=`, el drawer de ese contenedor encima.
export default async function PaginaDelEmbarque({
  params,
  searchParams,
}: PageProps<'/logistica/embarques/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <EmbarqueEnSuPagina
        id={id}
        permisos={sesion.permisos}
        falta={unParametro(parametros[CLAVE_DE_FALTA]) === VALOR_DE_FALTA}
        panel={unParametro(parametros[CLAVE_DE_PANEL])}
        contenedor={unParametro(parametros[CLAVE_DEL_CONTENEDOR_ABIERTO])}
      />
    </div>
  )
}
