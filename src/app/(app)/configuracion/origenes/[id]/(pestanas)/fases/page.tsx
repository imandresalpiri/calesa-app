import type { Metadata } from 'next'
import { unParametro } from '@/shared/lib/rutas'
import { EditorDelFlujo } from '../../../../_flujo/editor-del-flujo'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Fases del origen' }

// Configuración › Orígenes › un origen › Fases: las fases por las que pasa un vehículo de este origen, con sus reglas en el panel y, arriba del diagrama,
// los catálogos de su logística, cada uno en su drawer (`?panel=`). Pide `flujos.configurar` o los catálogos de logística en este origen (con sólo los
// catálogos, el diagrama se ve en lectura); nunca abre el flujo de otro.
export default async function PaginaFlujoDelOrigen({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/fases'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
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
