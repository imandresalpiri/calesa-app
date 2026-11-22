import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { destinoDeLaSeccionVieja } from '@/modules/leads'
import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { CAMPOS_DE_LEADS, PERMISO_DE_LAS_TARJETAS, SECCION_DE_LEADS } from './seccion'
import { SeccionDeLeads } from './tarjetas-de-leads'
import { comoBusqueda } from './url-vieja'

export const metadata: Metadata = { title: 'Configuración de leads' }

// Configuración › Leads: seis tarjetas, cada una con su modal por `?panel=` (`leads.configurar`). Las URLs de cuando había pestañas
// (`?seccion=`, con sus paneles) van primero a su lugar (`destinoDeLaSeccionVieja()`). Quien sólo gestiona los campos va a «Campos»; sin ninguno de los dos
// permisos, «No tienes permiso».
export default async function PaginaDeLeads({ searchParams }: PageProps<'/configuracion/leads'>) {
  const viejo = destinoDeLaSeccionVieja(comoBusqueda(await searchParams))
  if (viejo !== null) {
    redirigir(viejo)
  }
  const { permisos } = await requerirSesion()
  if (puede(permisos, PERMISO_DE_LAS_TARJETAS)) {
    return (
      <div className="grid gap-4">
        <EncabezadoDeConfiguracion {...SECCION_DE_LEADS} />
        <SeccionDeLeads />
      </div>
    )
  }
  if (CAMPOS_DE_LEADS.permisos.some((permiso) => puede(permisos, permiso))) {
    redirigir(RUTAS.camposDeLeads)
  }
  return <EstadoSinPermiso />
}
