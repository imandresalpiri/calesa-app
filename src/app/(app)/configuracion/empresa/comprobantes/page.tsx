import type { Metadata } from 'next'
import { SerieDeComprobantes } from '@/modules/cotizaciones/pantallas/comprobantes-empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { primeraSubseccionAbierta } from '../../secciones'
import { PERMISOS_DE_EMPRESA, SECCION_DE_EMPRESA } from '../seccion'
import { SUBSECCION_DE_COMPROBANTES } from './subseccion'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: SUBSECCION_DE_COMPROBANTES.titulo }

// Configuración › Empresa › Comprobantes, la sub-sección del área de comprobantes: la serie vigente y su cambio, con
// `empresa.ajustes.gestionar`. Quien entra a Empresa sin ese permiso la ve apagada en el menú y su URL lo lleva a la primera
// sub-sección que puede abrir; quien no entra a Empresa, «sin permiso».
export default async function PaginaComprobantesDeLaEmpresa() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { permisos } = await requerirSesion()
  if (!PERMISOS_DE_EMPRESA.some((clave) => puede(permisos, clave))) {
    return <EstadoSinPermiso />
  }
  if (!puede(permisos, 'empresa.ajustes.gestionar')) {
    redirigir(primeraSubseccionAbierta(SECCION_DE_EMPRESA, permisos) ?? RUTAS.empresa)
  }
  return (
    <div className="grid gap-4">
      <EncabezadoDeConfiguracion {...SUBSECCION_DE_COMPROBANTES} />
      <SerieDeComprobantes puedeCambiar />
    </div>
  )
}
