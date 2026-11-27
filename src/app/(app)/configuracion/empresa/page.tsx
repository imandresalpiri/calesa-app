import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { DATOS_DE_LA_EMPRESA, PERMISOS_DE_LA_EMPRESA } from './seccion'
import { SeccionEmpresa } from './seccion-empresa'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: DATOS_DE_LA_EMPRESA.titulo }

// Configuración › Empresa › Datos de la empresa, la sub-sección índice. Entra quien tiene alguno de los dos permisos de la empresa;
// sin `empresa.ajustes.gestionar` se ve deshabilitada, con el motivo.
export default async function PaginaDatosDeLaEmpresa() {
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
      <EncabezadoDeConfiguracion {...DATOS_DE_LA_EMPRESA} />
      <SeccionEmpresa puedeEditar={puede(permisos, 'empresa.ajustes.gestionar')} />
    </div>
  )
}
