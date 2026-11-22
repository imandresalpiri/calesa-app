import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLasTablas } from '@/modules/cotizaciones/pantallas/tablas'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'

export const metadata: Metadata = { title: 'Tablas del origen' }

// Configuración › Orígenes › un origen › Tablas: las tablas de referencia del origen y las compartidas que usa, con «Nueva tabla» (`?panel=nueva-tabla`); con
// `?tabla=<id>`, el editor de una (`?panel=publicar-tabla`, `columnas-de-tabla`, `desactivar-tabla`).
export default async function PaginaDeLasTablas({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/tablas'>) {
  const [{ id: idPedido }, parametros] = await Promise.all([params, searchParams])
  const abierto = await abrirOrigen(idPedido, 'tablas')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { id, nombre, activo } = abierto.origen
  const tablaPedida = unParametro(parametros['tabla'])
  return (
    <div className="grid max-w-3xl min-w-0 gap-4">
      <Suspense key={tablaPedida ?? ''} fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <SeccionDeLasTablas
          destino={{ origen: { id, nombre, activo } }}
          tablaPedida={tablaPedida}
        />
      </Suspense>
    </div>
  )
}
