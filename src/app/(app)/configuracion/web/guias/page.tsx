import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { entrarASubseccion } from '../entrar'
import { GUIAS_DEL_SITIO } from '../seccion'
import { SeccionGuias } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: GUIAS_DEL_SITIO.titulo }

// Configuración › Sitio web › Guías (`web.contenido.gestionar`): la lista con su búsqueda (`?q=`), «Categorías» y «Nueva guía». Cada guía se
// edita en `/configuracion/web/guias/[id]`.
export default async function PaginaDeGuiasDelSitio({
  searchParams,
}: PageProps<'/configuracion/web/guias'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (entrarASubseccion(permisos, GUIAS_DEL_SITIO) === 'sin-permiso') {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...GUIAS_DEL_SITIO} />
      <SeccionGuias buscar={unParametro(parametros['q'])?.trim() || null} />
    </div>
  )
}
