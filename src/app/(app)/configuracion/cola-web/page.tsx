import type { Metadata } from 'next'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import { ActualizarTablero } from '@/modules/web/pantallas/cola'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { EsqueletoDeLaCola } from './esqueleto-de-la-cola'
import { SECCION_DE_COLA_WEB } from './seccion'
import { TableroDeLaCola } from './tablero-de-la-cola'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: SECCION_DE_COLA_WEB.titulo }

// Configuración › Cola web (8.04-2): una página con tres bloques en orden —«Sin asignar», «En la rueda» y «Política de la cola»—, tarjetas en una rejilla que
// ocupa todo el ancho del área; «Actualizar» queda arriba. Entra quien tiene `web.cola.gestionar`; sin la clave, «No tienes permiso». Las lecturas y las
// escrituras de la base vuelven a exigir la clave. `?panel=agregar-a-la-rueda&q=` abre «Agregar a la rueda» y busca en el equipo (8.04-3); `?panel=politica`,
// `?panel=editar-en-la-rueda&para=` y `?panel=quitar-de-la-rueda&para=` abren sus modales.
export default async function PaginaDeColaWeb({
  searchParams,
}: PageProps<'/configuracion/cola-web'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'web.cola.gestionar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoDeConfiguracion {...SECCION_DE_COLA_WEB} />
        <ActualizarTablero />
      </div>
      <Suspense fallback={<EsqueletoDeLaCola />}>
        <TableroDeLaCola
          permisos={sesion.permisos}
          panel={unParametro(parametros['panel'])}
          busqueda={unParametro(parametros['q'])}
        />
      </Suspense>
    </div>
  )
}
