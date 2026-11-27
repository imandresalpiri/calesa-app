import type { Metadata } from 'next'
import { leerLaTarjetaDeLaFormula } from '@/modules/cotizaciones'
import { getTiposCambio } from '@/modules/empresa'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { NuevoColorAlVueloDiferido } from '@/modules/cotizaciones/pantallas/diseno-nuevo-color'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { puede } from '@/shared/lib/permisos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaFormulaDeLaPestana, formulaPedida } from '../_formula/abrir-formula'
import { MarcoDeLaFormula } from '../_formula/marco-de-la-formula'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Planilla de la fórmula' }

// Configuración › Orígenes › un origen › Planilla: qué se calcula, de la fórmula elegida (`?formula=<id>`; sin ella, la de trabajo). Arriba la barra de la fórmula;
// debajo la planilla con sus paneles en la URL (con `?fila=<id>`, esa fila elegida; al costado, `?costado=totales|tarjeta`). La tarjeta de la fórmula (área
// `plantilla`) y los tipos de cambio de la empresa («Tipo de celda › Tipo de cambio») se piden aquí como promesas, sin esperarlas: la sección las espera junto a
// la fórmula, y el dibujo de la tarjeta (área `tarjeta`) entra por el hueco `TarjetaEnVivo`; «+ Nuevo color» de una banda (área `diseno`), por `NuevoColor`.
export default async function PaginaDeLaPlanilla({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/planilla'>) {
  const oculto = await ocultoEnElLive('origenes.lectura')
  if (oculto) {
    return oculto
  }
  const [{ id }, consulta] = await Promise.all([params, searchParams])
  const abierta = await abrirLaFormulaDeLaPestana(id, 'planilla', formulaPedida(consulta))
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const { nombre, activo } = abierta.origen
  const origen = { id: abierta.origen.id, nombre, activo }
  return (
    <MarcoDeLaFormula abierta={abierta} parte="planilla" consulta={consulta}>
      {abierta.formula ? (
        <SeccionDeLaFormula
          origen={origen}
          formula={abierta.formula}
          tarjeta={leerLaTarjetaDeLaFormula(origen, abierta.formula.id)}
          TarjetaEnVivo={TarjetaEnVivoDiferida}
          // El catálogo de colores es de la empresa: como `tono_crear()`, sin origen.
          NuevoColor={
            puede(abierta.sesion.permisos, 'cotizaciones.configurar')
              ? NuevoColorAlVueloDiferido
              : null
          }
          tiposDeCambio={getTiposCambio().then((tipos) =>
            tipos.map(({ clave, nombre: elNombre }) => ({ clave, nombre: elNombre })),
          )}
          puedeCambiarTiposDeCambio={puede(
            abierta.sesion.permisos,
            'empresa.tipos_cambio.gestionar',
          )}
        />
      ) : null}
    </MarcoDeLaFormula>
  )
}
