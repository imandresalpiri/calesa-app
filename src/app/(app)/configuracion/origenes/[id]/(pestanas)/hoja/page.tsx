import type { Metadata } from 'next'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaFormulaDeLaPestana, formulaPedida } from '../_formula/abrir-formula'
import { MarcoDeLaFormula } from '../_formula/marco-de-la-formula'

export const metadata: Metadata = { title: 'Hoja de la fórmula' }

// Configuración › Orígenes › un origen › Hoja: cómo se ve y se llena la cotización (el diseño de la hoja) de la fórmula elegida (`?formula=<id>`; sin ella, la de
// trabajo), bajo la barra de la fórmula. Con `?vista=412|1280|200`, la vista previa en vivo; desde `xl`, al costado.
export default async function PaginaDeLaHoja({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/hoja'>) {
  const [{ id }, consulta] = await Promise.all([params, searchParams])
  const abierta = await abrirLaFormulaDeLaPestana(id, 'hoja', formulaPedida(consulta))
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const { nombre, activo } = abierta.origen
  return (
    <MarcoDeLaFormula abierta={abierta} parte="hoja" consulta={consulta}>
      {abierta.formula ? (
        <SeccionDelDiseno
          origen={{ id: abierta.origen.id, nombre, activo }}
          formula={abierta.formula}
        />
      ) : null}
    </MarcoDeLaFormula>
  )
}
