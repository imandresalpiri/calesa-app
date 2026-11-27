import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { INTEGRACIONES_DE_LA_EMPRESA, PERMISOS_DE_LA_EMPRESA } from '../seccion'
import { SeccionIntegraciones } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: INTEGRACIONES_DE_LA_EMPRESA.titulo }

// Configuración › Empresa › Integraciones. Entra quien tiene alguno de los dos permisos de la empresa; se edita con
// `empresa.ajustes.gestionar` (sin él, deshabilitada con el motivo). Los interruptores guardan al instante; lo demás se edita en un modal.
export default async function PaginaIntegracionesDeLaEmpresa() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { permisos } = await requerirSesion()
  if (!PERMISOS_DE_LA_EMPRESA.some((clave) => puede(permisos, clave))) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...INTEGRACIONES_DE_LA_EMPRESA} />
      <SeccionIntegraciones puedeEditar={puede(permisos, 'empresa.ajustes.gestionar')} />
    </div>
  )
}
