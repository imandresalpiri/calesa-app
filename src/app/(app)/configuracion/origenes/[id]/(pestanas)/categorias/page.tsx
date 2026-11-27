import type { Metadata } from 'next'
import { leerLayout } from '@/modules/origenes'
import { ArbolDeCategorias } from '@/modules/origenes/pantallas/origen-categorias'
import { datosO } from '@/shared/lib/errores'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Categorías del origen' }

// Configuración › Orígenes › un origen › Categorías. Contar vehículos por categoría pide `origenes.gestionar`: sin él la lista no muestra
// números en vez de mostrar ceros.
export default async function PaginaCategoriasDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/categorias'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const abierto = await abrirOrigen((await params).id, 'categorias')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { origen, puedeGestionar } = abierto
  const { categorias } = datosO(await leerLayout(origen.id, { conUso: puedeGestionar }))
  return (
    <div className="grid min-w-0 gap-4">
      <ArbolDeCategorias
        origenId={origen.id}
        sustantivo={origen.sustantivo}
        categorias={categorias}
        puedeGestionar={puedeGestionar}
      />
    </div>
  )
}
