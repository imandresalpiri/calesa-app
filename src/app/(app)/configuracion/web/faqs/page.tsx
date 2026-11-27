import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { entrarASubseccion } from '../entrar'
import { FAQS_DEL_SITIO } from '../seccion'
import { SeccionFaqs } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: FAQS_DEL_SITIO.titulo }

// Configuración › Sitio web › Preguntas frecuentes (`web.contenido.gestionar`): la lista en el orden en que se ve, con su panel por URL.
export default async function PaginaDeFaqsDelSitio() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { permisos } = await requerirSesion()
  if (entrarASubseccion(permisos, FAQS_DEL_SITIO) === 'sin-permiso') {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...FAQS_DEL_SITIO} />
      <SeccionFaqs />
    </div>
  )
}
