import type { Metadata } from 'next'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EditorDelFlujo } from '../../../configuracion/_flujo/editor-del-flujo'
import { abrirLaPestana } from '../abrir'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: 'Flujo de repuestos' }

// Repuestos › Configuración › Flujo: las fases por las que avanza un ítem, con sus reglas y sus tipos de documento en el panel (`?seccion=reglas|documentos`, `?fase=`), en el editor
// de la pestaña Fases de un origen y sin selector. Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso». La base vuelve a decidir cada escritura.
export default async function PaginaDelFlujoDeRepuestos({
  searchParams,
}: PageProps<'/repuestos/configuracion/flujo'>) {
  const oculto = await ocultoEnElLive('repuestos')
  if (oculto) {
    return oculto
  }
  const [abierto, parametros] = await Promise.all([abrirLaPestana(), searchParams])
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  return (
    <EditorDelFlujo
      permisos={abierto.sesion.permisos}
      fijo={{ ambito: 'repuestos' }}
      seccionPedida={unParametro(parametros['seccion'])}
      panelPedido={unParametro(parametros['panel'])}
    />
  )
}
