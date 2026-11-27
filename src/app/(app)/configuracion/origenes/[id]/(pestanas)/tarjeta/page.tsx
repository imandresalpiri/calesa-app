import type { Metadata } from 'next'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { puede } from '@/shared/lib/permisos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaFormulaDeLaPestana, formulaPedida } from '../_formula/abrir-formula'
import { MarcoDeLaFormula } from '../_formula/marco-de-la-formula'
import { leerReferenciaDeLaTarjeta } from './referencia'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Tarjeta de la fórmula' }

// Configuración › Orígenes › un origen › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización) de la fórmula elegida
// (`?formula=<id>`; sin ella, la de trabajo), editada como un Excel sobre el lienzo bajo la barra de la fórmula: el lienzo es la vista previa
// (`?panel=publicar-tarjeta`, `descartar-plantilla`; `?lugar=` elige esa celda al abrir). La referencia del lienzo (la cotización más reciente del origen que
// quien configura ve) se pide aquí como promesa, sin esperarla: la sección la espera junto a la plantilla y la latencia es la de la más lenta.
export default async function PaginaDeLaTarjeta({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/tarjeta'>) {
  const oculto = await ocultoEnElLive('origenes.lectura')
  if (oculto) {
    return oculto
  }
  const [{ id }, consulta] = await Promise.all([params, searchParams])
  const abierta = await abrirLaFormulaDeLaPestana(id, 'tarjeta', formulaPedida(consulta))
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const { sesion } = abierta
  const { nombre, activo } = abierta.origen
  const origenId = abierta.origen.id
  return (
    <MarcoDeLaFormula abierta={abierta} parte="tarjeta" consulta={consulta}>
      {abierta.formula ? (
        <SeccionDeLaPlantilla
          origen={{ id: origenId, nombre, activo }}
          formula={abierta.formula}
          referencia={leerReferenciaDeLaTarjeta(origenId, sesion)}
          Lienzo={LienzoDeLaPlantillaDiferido}
          puedeCambiarElLogo={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
        />
      ) : null}
    </MarcoDeLaFormula>
  )
}
