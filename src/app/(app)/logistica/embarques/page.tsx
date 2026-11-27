import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requerirSesion } from '@/modules/equipo'
import {
  CLAVE_DEL_CONTENEDOR_ABIERTO,
  CLAVE_DE_GRUPO,
  enElOrigen,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  esquemaDeFiltrosDeEmbarques,
  leerCatalogosDeTransporte,
  leerContenedores,
  leerEmbarques,
  PANEL_NUEVO_EMBARQUE,
  pedidoDeEmbarques,
  vistaDeGrupos,
  vistaDelOrigen,
  vistasDeTransporte,
  type PedidoDeEmbarques,
} from '@/modules/logistica'
import {
  DrawerDelContenedor,
  ListadoDeEmbarques,
  ModalDelEmbarque,
} from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL, leerFiltros } from '@/shared/lib/filtros'
import { puede } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { abrirLaPestana } from '../abrir-la-pestana'
import { BarraDeLogistica } from '../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'
import { EstadoDelOrigen } from '../estado-del-origen'
import { ContenedorAbierto } from './contenedor-abierto'
import { SiSeVeEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Embarques' }

// Los embarques y los contenedores del origen elegido (`docs/UX.md` › «Logística»): una página por cursor opaco, con sus filtros en la URL (`estado`, `naviera`, `puerto_origen`,
// `puerto_destino`, `q`). Sólo las vistas que usa el flujo del origen (`vistasDeTransporte`); la URL que pide la otra dice que el origen no la usa. La base lista las entidades del
// origen (también las vacías) y cuenta sólo los vehículos que quien mira ve; acá sólo se arma el pedido y se dibuja. Un embarque se abre en su página
// (`/logistica/embarques/<id>`); un contenedor, en su drawer (`?contenedor=`). Ningún total exacto.
export default function PaginaDeEmbarques({ searchParams }: PageProps<'/logistica/embarques'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Embarques</h1>
      <SiSeVeEnElLive area="logistica">
        <Suspense fallback={<EsqueletoDeLaBarra />}>
          <BarraDeLogistica searchParams={searchParams} pestana="embarques" />
        </Suspense>
        <Suspense fallback={<EsqueletoListado filas={8} columnas={7} />}>
          <Listado searchParams={searchParams} />
        </Suspense>
      </SiSeVeEnElLive>
    </div>
  )
}

async function leerLaPagina(pedido: PedidoDeEmbarques) {
  return pedido.vista === 'contenedores'
    ? { vista: 'contenedores' as const, pagina: datosO(await leerContenedores(pedido)) }
    : { vista: 'embarques' as const, pagina: datosO(await leerEmbarques(pedido)) }
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/embarques'>['searchParams']
}) {
  const abierta = await abrirLaPestana(searchParams, 'embarques')
  if (abierta.tipo === 'estado') return abierta.estado
  const { permisos, origen, parametros } = abierta
  // `abrirLaPestana` ya vio que las reglas se leyeron y que el origen usa alguna de las dos.
  const vistas = vistasDeTransporte(origen.reglas ?? [])
  const pedida = unParametro(parametros[CLAVE_DE_GRUPO])
  const vista = vistaDelOrigen(pedida, vistas)
  if (vista === 'no_usa') {
    return (
      <EstadoDelOrigen
        estado={{
          tipo: 'no_usa',
          origen: origen.nombre,
          pestana: ETIQUETA_DE_VISTA_DE_GRUPOS[vistaDeGrupos(pedida)],
          hrefDeLaCadena: enElOrigen(RUTAS.logistica, origen.id),
        }}
      />
    )
  }
  const [sesion, catalogos] = await Promise.all([
    requerirSesion(),
    leerCatalogosDeTransporte().then(datosO),
  ])
  const esquema = esquemaDeFiltrosDeEmbarques(vista, catalogos)
  const pedido = pedidoDeEmbarques(leerFiltros(esquema, parametros), {
    origenId: origen.id,
    vista,
    desde: unParametro(parametros[CLAVE_DE_CURSOR]) ?? null,
  })
  const lista = await leerLaPagina(pedido)
  const puedeEditar = puede(permisos, 'logistica.transporte.editar', origen.id)
  const panel = unParametro(parametros[CLAVE_DE_PANEL])
  const contenedor = unParametro(parametros[CLAVE_DEL_CONTENEDOR_ABIERTO])
  return (
    <>
      <ListadoDeEmbarques
        lista={lista}
        vistas={vistas}
        origenId={origen.id}
        origenNombre={origen.nombre}
        esquema={esquema}
        catalogos={catalogos}
        puedeEditar={puedeEditar}
        ruta={RUTAS.embarques}
        vistaPreferida={sesion.preferencias.vistaDeEmbarques}
      />
      {/* Sin permiso, `?panel=nuevo-embarque` no abre nada. */}
      {panel === PANEL_NUEVO_EMBARQUE && puedeEditar && contenedor === undefined ? (
        <ModalDelEmbarque original={null} origenId={origen.id} catalogos={catalogos} />
      ) : null}
      {contenedor === undefined ? null : (
        <DrawerDelContenedor>
          <Suspense key={contenedor} fallback={<EsqueletoDetalle />}>
            <ContenedorAbierto id={contenedor} panel={panel} permisos={permisos} />
          </Suspense>
        </DrawerDelContenedor>
      )}
    </>
  )
}
