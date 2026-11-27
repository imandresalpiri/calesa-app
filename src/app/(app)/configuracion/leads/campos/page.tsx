import type { Metadata } from 'next'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { abrirCamposDeLeads } from '../abrir'
import { CAMPOS_DE_LEADS } from '../seccion'
import { SeccionCampos } from './seccion'
import { ocultoEnElLive } from '../../../_live/guarda'

// «Campos» a secas se repetiría con otras pantallas en la pestaña del navegador.
export const metadata: Metadata = { title: 'Campos de los leads' }

// Configuración › Leads › Campos: el layout de los campos de los leads (`leads.campos.gestionar`).
// Sin su permiso, a la primera sub-sección abierta (`abrir.ts`).
export default async function PaginaCamposDeLeads() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { sinPermiso } = await abrirCamposDeLeads()
  if (sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid min-w-0 gap-4">
      <EncabezadoDeConfiguracion {...CAMPOS_DE_LEADS} />
      <SeccionCampos />
    </div>
  )
}
