import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { entrarASubseccion } from '../entrar'
import { LEGALES_DEL_SITIO } from '../seccion'
import { SeccionLegales } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: LEGALES_DEL_SITIO.titulo }

// Configuración › Sitio web › Legales (`web.ajustes.gestionar`): los términos y la privacidad, una tarjeta por documento que se edita en un modal.
export default async function PaginaDeLegalesDelSitio() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { permisos } = await requerirSesion()
  if (entrarASubseccion(permisos, LEGALES_DEL_SITIO) === 'sin-permiso') {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...LEGALES_DEL_SITIO} />
      <SeccionLegales />
    </div>
  )
}
