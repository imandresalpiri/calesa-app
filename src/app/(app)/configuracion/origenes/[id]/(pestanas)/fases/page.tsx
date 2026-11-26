import type { Metadata } from 'next'
import { unParametro } from '@/shared/lib/rutas'
import { EditorDelFlujo } from '../../../../_flujo/editor-del-flujo'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'

export const metadata: Metadata = { title: 'Fases del origen' }

// Configuración › Orígenes › un origen › Fases: las fases por las que pasa un vehículo de este origen, con sus reglas y sus tipos de documento en el panel.
// Pide `flujos.configurar` en este origen; nunca abre el flujo de otro.
export default async function PaginaFlujoDelOrigen({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/fases'>) {
  const [{ id }, parametros] = await Promise.all([params, searchParams])
  const abierto = await abrirOrigen(id, 'fases')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  return (
    <EditorDelFlujo
      permisos={abierto.sesion.permisos}
      fijo={{ origenId: abierto.origen.id }}
      seccionPedida={unParametro(parametros['seccion'])}
      panelPedido={unParametro(parametros['panel'])}
    />
  )
}
