import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { entrarASubseccion } from '../entrar'
import { TESTIMONIOS_DEL_SITIO } from '../seccion'
import { SeccionTestimonios } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: TESTIMONIOS_DEL_SITIO.titulo }

// Configuración › Sitio web › Testimonios (`web.contenido.gestionar`): lo que dicen los clientes, con su consentimiento y su panel por URL.
export default async function PaginaDeTestimoniosDelSitio() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { permisos } = await requerirSesion()
  if (entrarASubseccion(permisos, TESTIMONIOS_DEL_SITIO) === 'sin-permiso') {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...TESTIMONIOS_DEL_SITIO} />
      <SeccionTestimonios />
    </div>
  )
}
