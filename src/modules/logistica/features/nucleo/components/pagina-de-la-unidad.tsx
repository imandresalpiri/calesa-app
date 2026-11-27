import type { ReactNode } from 'react'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { EnLaPagina } from '../disposicion'
import { BarraDeMover } from './barra-de-mover'
import { CabeceraDeLaUnidad } from './cabecera-de-la-unidad'
import { ColumnaDeQueFalta } from './columna-de-que-falta'
import { ContenidoDelHueco } from './contenido-del-hueco'

type Props = {
  unidad: UnidadAbierta
  origen: string
  fase: { nombre: string; color: string } | null
  // Los huecos que se dibujan, ya filtrados y en orden (`huecosVisibles`): de aquí sale «Qué falta»; los demás van en las tarjetas.
  huecos: readonly HuecoDeLaUnidad[]
  aviso?: string | null
  // Lo que compone `src/app` (`logistica` no conoce `vehiculos` ni `repuestos`): la cabecera de la página, la cadena y las tarjetas con sus resúmenes del servidor.
  cabecera?: NonNullable<Parameters<typeof CabeceraDeLaUnidad>[0]['enLaPagina']>
  cadena?: ReactNode
  tarjetas: ReactNode
  puedeMover?: boolean
}

const QUE_FALTA = 'que-falta'

// La unidad en su propia página: la cabecera baja, la cadena de fases y, debajo, las tarjetas en dos columnas con «Qué falta» fijo a la derecha. La forma la pone sólo el CSS
// (`@container/unidad`, desde 56 rem): el mismo DOM en los dos anchos, nada salta al hidratar. En escritorio la página no se desplaza (el alto lo fija `src/app` con
// `--alto-del-detalle`) y las tarjetas y «Qué falta» se desplazan cada una por dentro; por debajo, una columna (cabecera, cadena, «Qué falta», tarjetas) con la barra «Mover».
// Con el texto al 200 % los rem crecen y la página vuelve sola a una columna. Compatible con servidor.
export function PaginaDeLaUnidad({
  unidad,
  origen,
  fase,
  huecos,
  aviso = null,
  cabecera = {},
  cadena = null,
  tarjetas,
  puedeMover = false,
}: Props) {
  const queFalta = huecos.find((h) => h.clave === QUE_FALTA)
  return (
    <div data-slot="panel-de-la-unidad" className="@container/unidad min-w-0">
      <EnLaPagina>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 @min-[56rem]/unidad:h-(--alto-del-detalle) @min-[56rem]/unidad:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] @min-[56rem]/unidad:grid-rows-[auto_auto_minmax(0,1fr)]">
          <div className="min-w-0 @min-[56rem]/unidad:col-span-2">
            <CabeceraDeLaUnidad
              unidad={unidad}
              origen={origen}
              fase={fase}
              aviso={aviso}
              enLaPagina={cabecera}
            />
          </div>
          {cadena ? <div className="min-w-0 @min-[56rem]/unidad:col-span-2">{cadena}</div> : null}
          {queFalta ? (
            <div className="grid min-h-0 min-w-0 @min-[56rem]/unidad:col-start-2 @min-[56rem]/unidad:row-start-3">
              <ColumnaDeQueFalta titulo={queFalta.titulo}>
                <ContenidoDelHueco hueco={queFalta} unidad={unidad} />
              </ColumnaDeQueFalta>
            </div>
          ) : null}
          <div
            data-slot="tarjetas-de-la-unidad"
            className="min-h-0 min-w-0 @min-[56rem]/unidad:col-start-1 @min-[56rem]/unidad:row-start-3 @min-[56rem]/unidad:overflow-y-auto"
          >
            {tarjetas}
          </div>
        </div>
        {puedeMover && queFalta ? <BarraDeMover /> : null}
      </EnLaPagina>
    </div>
  )
}
