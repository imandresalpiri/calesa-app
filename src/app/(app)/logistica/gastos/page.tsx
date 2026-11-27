import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  CLAVE_DE_VISTA,
  esquemaDeFiltrosDeDinero,
  leerCategoriasDeGasto,
  leerGastosDelListado,
  leerPagosDelListado,
  pedidoDeDinero,
  vistaDe,
  vistasPermitidas,
} from '@/modules/logistica'
import { ListadoDeDinero } from '@/modules/logistica/pantallas/dinero'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { abrirLaPestana } from '../abrir-la-pestana'
import { BarraDeLogistica } from '../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'
import { CLAVE_DE_UNIDAD } from '../clave-de-unidad'
import { DrawerDeLaUnidad } from '../drawer-de-la-unidad'
import { MarcasDeLogistica } from '../marcas-de-logistica'
import { UnidadAbierta } from '../unidad-abierta'

export const metadata: Metadata = { title: 'Gastos' }

// Los gastos y los pagos del origen elegido que quien mira puede ver (`docs/UX.md` › «Logística»): `?ver=gastos|pagos`, una página por cursor `(fecha, id)` con
// sus filtros en la URL (el origen no es uno: es el de la barra). Lo que se ve lo decide la base (`gastos_listar()` y `pagos_listar()` son invocadoras y salen vacías sin la clave del origen); acá sólo se arma el pedido y se dibuja. La fila abre el panel de su unidad
// (`?vehiculo=`), el mismo de `/logistica`. Ninguna suma: lo que se muestra es la fila.
export default function PaginaDeGastosDeLogistica({
  searchParams,
}: PageProps<'/logistica/gastos'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Gastos</h1>
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="gastos" />
      </Suspense>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={5} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/gastos'>['searchParams']
}) {
  const abierta = await abrirLaPestana(searchParams, 'gastos')
  if (abierta.tipo === 'estado') return abierta.estado
  const { permisos, origen, parametros } = abierta
  const vista = vistaDe(unParametro(parametros[CLAVE_DE_VISTA]), permisos, origen.id)
  if (vista === null) {
    return <EstadoSinPermiso />
  }
  // Las categorías que pueden tener los gastos del origen: las suyas y las compartidas.
  const categorias =
    vista === 'gastos'
      ? datosO(await leerCategoriasDeGasto()).filter(
          (c) => c.origenId === null || c.origenId === origen.id,
        )
      : []
  const esquema = esquemaDeFiltrosDeDinero(vista, { categorias })
  const pedido = pedidoDeDinero(vista, leerFiltros(esquema, parametros), {
    origenId: origen.id,
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
  })
  const lista =
    vista === 'gastos'
      ? ({ vista, pagina: datosO(await leerGastosDelListado(pedido)) } as const)
      : ({ vista, pagina: datosO(await leerPagosDelListado(pedido)) } as const)
  const unidad = unParametro(parametros[CLAVE_DE_UNIDAD])
  return (
    <>
      {/* La fila abre el panel de su unidad (`?vehiculo=`): ahí se registra, una vez, y el resto de la lista lo marca. */}
      <MarcasDeLogistica
        ids={lista.pagina.filas.map((fila) => fila.vehiculoId)}
        parametro={CLAVE_DE_UNIDAD}
      >
        <ListadoDeDinero
          lista={lista}
          vistas={vistasPermitidas(permisos, origen.id)}
          esquema={esquema}
          claveDeUnidad={CLAVE_DE_UNIDAD}
          origenId={origen.id}
        />
      </MarcasDeLogistica>
      {unidad ? (
        <DrawerDeLaUnidad>
          <Suspense key={unidad} fallback={<EsqueletoDetalle />}>
            <UnidadAbierta id={unidad} permisos={permisos} />
          </Suspense>
        </DrawerDeLaUnidad>
      ) : null}
    </>
  )
}
