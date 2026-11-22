import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { DATOS_DE_LA_EMPRESA, PERMISOS_DE_LA_EMPRESA } from './seccion'
import { SeccionEmpresa } from './seccion-empresa'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: DATOS_DE_LA_EMPRESA.titulo }

// Configuración › Empresa › Datos de la empresa, la sub-sección índice. Entra quien tiene alguno de los dos permisos de la empresa;
// sin `empresa.ajustes.gestionar` se ve deshabilitada, con el motivo. Las URLs de cuando Empresa tenía pestañas (`?seccion=`, `?tc=`,
// `?moneda=`, `?panel=`) van primero a su sub-ruta (`url-vieja.ts`).
export default async function PaginaDatosDeLaEmpresa({
  searchParams,
}: PageProps<'/configuracion/empresa'>) {
  const parametros = await searchParams
  const destino = destinoDeLaUrlVieja({
    seccion: unParametro(parametros['seccion']),
    tc: unParametro(parametros['tc']),
    moneda: unParametro(parametros['moneda']),
    panel: unParametro(parametros['panel']),
  })
  if (destino !== null) {
    redirigir(destino)
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
