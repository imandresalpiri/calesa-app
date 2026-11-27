import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import {
  CLAVE_DE_AGRUPAR,
  MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  PANEL_DE_COTIZACIONES_DEL_VEHICULO,
  agruparDelListado,
  esquemaDelListado,
  idDelResumen,
  origenParaNueva,
  pedidoDelListado,
  rutaDeLaHoja,
  CLAVE_DE_LEAD,
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  CLAVE_DE_VEHICULO,
  type PedidoDelGrupo,
  type PedidoDelListado,
} from '@/modules/cotizaciones'
import { HUECOS_DE_PAPELERA_EN_EL_LISTADO } from '@/modules/cotizaciones/pantallas/papelera-listado'
import { leerVistas, requerirSesion, type EstadoDelLive } from '@/modules/equipo'
import { MarcasDeVistoDeLaPagina } from '@/modules/equipo/pantallas/marcas-de-visto'
import { getOrigenes } from '@/modules/origenes'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import {
  CLAVE_DE_CURSOR,
  CLAVE_DE_PANEL,
  CLAVE_DE_POR_PAGINA,
  leerFiltros,
} from '@/shared/lib/filtros'
import { leerCursor, leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { origenesCon, puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { conLaDelResumen } from './la-del-resumen'
import { leerLaDelResumen, leerLaPagina, nombreDelLead } from './lecturas-de-la-pagina'
import { ListadoConAcciones } from './listado-con-acciones'
import { menusDeLaPagina, quienesDelResumen } from './menus-de-la-pagina'
import { SiSeVeEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Cotizaciones' }

// Las cotizaciones que quien mira ve (`docs/UX.md` › «Cotizaciones»): una página por cursor con sus filtros en la URL, agrupada por vehículo salvo que se apague. Lo que se
// ve lo decide la RLS (`cotizaciones_listado()` y `cotizaciones_listado_por_vehiculo()` son invocadoras); acá sólo se arma el pedido, se leen los nombres de la página y
// se dibuja.
export default function PaginaDeCotizaciones({ searchParams }: PageProps<'/cotizaciones'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={8} />}>
      <SiSeVeEnElLive area="cotizaciones">
        <Listado searchParams={searchParams} />
      </SiSeVeEnElLive>
    </Suspense>
  )
}

// Los filtros de la página que valen para el despliegue de un grupo (las del vehículo que coinciden; con la búsqueda, las que la cumplen).
function filtrosDelGrupo(pedido: PedidoDelListado): Omit<PedidoDelGrupo, 'vehiculoId' | 'cursor'> {
  const { origenId, clase, mias, leadId, texto } = pedido
  return {
    ...(origenId === undefined ? {} : { origenId }),
    ...(clase === undefined ? {} : { clase }),
    ...(mias === undefined ? {} : { mias }),
    ...(leadId === undefined ? {} : { leadId }),
    ...(texto === undefined ? {} : { texto }),
  }
}

// Lo que el área `papelera` suma al grupo «Más» de «Vista y opciones» (4.24), sólo si quien mira lo vería: así «Más» nunca queda vacío.
function juntoDelListado(permisos: Permisos): ReactNode {
  const { Junto, hayJunto } = HUECOS_DE_PAPELERA_EN_EL_LISTADO
  if (Junto === undefined || hayJunto?.(permisos) === false) {
    return undefined
  }
  return <Junto permisos={permisos} />
}

type Parametros = Awaited<PageProps<'/cotizaciones'>['searchParams']>

// Con el Modo Live en algunos orígenes la lista no pide «todos» (las lecturas usan la RLS, con los permisos reales): sin un origen que el Live muestre,
// se pide el primero de los visibles (`visibles` ya sale de los permisos recortados).
function conOrigenDelLive(
  pedido: PedidoDelListado,
  live: EstadoDelLive,
  visibles: readonly { id: string }[],
): PedidoDelListado {
  if (!live.encendido || live.ajustes.origenes === 'todos') {
    return pedido
  }
  if (pedido.origenId !== undefined && visibles.some((origen) => origen.id === pedido.origenId)) {
    return pedido
  }
  const primero = visibles[0]
  return primero === undefined ? pedido : { ...pedido, origenId: primero.id }
}

// Lo que pide la URL (con las preferencias de la persona): el tamaño, los filtros y el cursor, y si pide la lista agrupada por vehículo (`docs/UX.md` ›
// «Cotizaciones»: la URL o la preferencia; con `?vehiculo=` la página no agrupa aunque se pida).
function pedidoDeLaPagina(
  esquema: ReturnType<typeof esquemaDelListado>,
  parametros: Parametros,
  preferencias: { porPagina: number | null; agruparCotizaciones: boolean | null },
) {
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia: preferencias.porPagina,
    maximo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  })
  const pedido = pedidoDelListado(leerFiltros(esquema, parametros), {
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano,
    // Con el modal de las cotizaciones de un vehículo abierto, `?vehiculo=` es del modal y no el filtro: la lista de atrás sigue agrupada.
    vehiculo:
      unParametro(parametros[CLAVE_DE_PANEL]) === PANEL_DE_COTIZACIONES_DEL_VEHICULO
        ? undefined
        : unParametro(parametros[CLAVE_DE_VEHICULO]),
    lead: unParametro(parametros[CLAVE_DE_LEAD]),
  })
  const agruparPedido = agruparDelListado({
    pedida: unParametro(parametros[CLAVE_DE_AGRUPAR]),
    preferida: preferencias.agruparCotizaciones,
    vehiculo: false,
  })
  return { tamano, pedido, agruparPedido }
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/cotizaciones'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  // Los orígenes con `cotizaciones.ver` (también los desactivados: sus cotizaciones siguen ahí).
  const todos = datosO(await getOrigenes(true))
  const visibles = todos.filter((origen) => puede(sesion.permisos, 'cotizaciones.ver', origen.id))
  if (visibles.length === 0) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver cotizaciones en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  const esquema = esquemaDelListado(visibles)
  const deLaUrl = pedidoDeLaPagina(esquema, parametros, sesion.preferencias)
  const { tamano, agruparPedido } = deLaUrl
  const pedido = conOrigenDelLive(deLaUrl.pedido, sesion.live, visibles)
  const agrupada = agruparPedido && pedido.vehiculoId === undefined
  const { pagina, cotizaciones, acotada } = await leerLaPagina(sesion, pedido, agrupada)
  // La del resumen, si la URL trae una que no está en la página (también una línea del modal de un grupo); lo demás, en paralelo.
  const idDelResumenUrl = idDelResumen(unParametro(parametros[CLAVE_DE_RESUMEN_DE_COTIZACION]))
  const faltaLaDelResumen =
    idDelResumenUrl !== null && !cotizaciones.some((fila) => fila.id === idDelResumenUrl)
  const [delServidor, deUnLead, vistas] = await Promise.all([
    faltaLaDelResumen ? leerLaDelResumen(sesion, idDelResumenUrl) : null,
    nombreDelLead(sesion, pedido.leadId),
    leerVistas('cotizaciones'),
  ])
  // El «⋯» de cada fila y el de la del resumen que no está en la página: su versión, sus marcas y lo que ofrece a quien mira (tres lecturas por clave primaria
  // para toda la página, con un id más si hay una del resumen).
  const menus = await menusDeLaPagina(sesion, conLaDelResumen(cotizaciones, delServidor))
  // Lo que cada pestaña del resumen deja hacer (adjuntar y moderar): las de la página y la que abrió la URL.
  const quienes = quienesDelResumen(sesion, cotizaciones, delServidor)
  // Con `?vehiculo=`, de quién son estas cotizaciones: el título sólo si quien mira ve el vehículo (la lectura es nula si no existe o no se ve).
  const deUnVehiculo =
    pedido.vehiculoId === undefined
      ? undefined
      : { titulo: datosO(await leerVehiculo(pedido.vehiculoId))?.titulo ?? null }
  const origenDeNueva = origenParaNueva(sesion.permisos, visibles, pedido.origenId)

  return (
    // El resumen de `?cotizacion=` y las filas de la página marcan lo visto en el módulo (una lectura por página).
    <MarcasDeVistoDeLaPagina
      modulo="cotizaciones"
      consultas={[
        {
          tipo: 'cotizacion',
          ids: cotizaciones.map((fila) => fila.id),
          parametro: CLAVE_DE_RESUMEN_DE_COTIZACION,
        },
      ]}
    >
      <ListadoConAcciones
        esquema={esquema}
        pagina={pagina}
        acotada={acotada}
        vistaPreferida={sesion.preferencias.vistaDeCotizaciones}
        agruparPedido={agruparPedido}
        rutaDeClientes={puede(sesion.permisos, 'leads.ver') ? RUTAS.leads : null}
        filtrosDelGrupo={filtrosDelGrupo(pedido)}
        vistas={datosO(vistas)}
        menus={menus}
        quienesDelResumen={quienes}
        aprobarEn={origenesCon(sesion.permisos, 'cotizaciones.aprobar')}
        vehiculosVisibles={origenesCon(sesion.permisos, 'vehiculos.ver')}
        delServidor={delServidor}
        porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_COTIZACIONES) }}
        origenes={visibles.map((origen) => ({
          id: origen.id,
          nombre: origen.nombre,
          color: origen.color,
        }))}
        {...(deUnVehiculo === undefined ? {} : { vehiculo: deUnVehiculo })}
        {...(deUnLead === undefined ? {} : { lead: deUnLead })}
        rutaDeNueva={
          origenDeNueva === null ? null : rutaDeLaHoja({ origen: origenDeNueva, lead: null })
        }
        junto={juntoDelListado(sesion.permisos)}
      />
    </MarcasDeVistoDeLaPagina>
  )
}
