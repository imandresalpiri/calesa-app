import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { MONEDAS_DE_LA_EMPRESA, PERMISOS_DE_LA_EMPRESA } from '../seccion'
import { SeccionMonedas } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: MONEDAS_DE_LA_EMPRESA.titulo }

// Configuración › Empresa › Monedas y tipos de cambio. Entra quien tiene alguno de los dos permisos de la empresa; se edita con
// `empresa.tipos_cambio.gestionar` (sin él, deshabilitada con el motivo). Cada panel tiene su URL (`?tc=`, `?moneda=`, `?panel=`).
export default async function PaginaMonedasDeLaEmpresa({
  searchParams,
}: PageProps<'/configuracion/empresa/monedas'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!PERMISOS_DE_LA_EMPRESA.some((clave) => puede(permisos, clave))) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...MONEDAS_DE_LA_EMPRESA} />
      <SeccionMonedas
        puedeGestionar={puede(permisos, 'empresa.tipos_cambio.gestionar')}
        puedeEditarAjustes={puede(permisos, 'empresa.ajustes.gestionar')}
        tipoCambioAbierto={unParametro(parametros['tc'])}
      />
    </div>
  )
}
