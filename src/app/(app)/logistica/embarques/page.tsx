import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  claveDelResumenDe,
  CLAVE_DE_GRUPO,
  enElOrigen,
  ETIQUETA_DE_VISTA_DE_GRUPOS,
  esquemaDeFiltrosDeGrupos,
  leerCatalogosDeTransporte,
  leerGrupos,
  PANEL_EDITAR_GRUPO,
  pedidoDeGrupos,
  vistaDeGrupos,
  vistaDelOrigen,
  vistasDeTransporte,
} from '@/modules/logistica'
import { DrawerDelGrupo, ListadoDeEmbarques } from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL, leerFiltros } from '@/shared/lib/filtros'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { abrirLaPestana } from '../abrir-la-pestana'
import { BarraDeLogistica } from '../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'
import { EstadoDelOrigen } from '../estado-del-origen'
import { GrupoAbierto } from './grupo-abierto'
import { GrupoEnEdicion } from './grupo-en-edicion'
import { puedeEditarTransporte } from './huecos-del-grupo'

export const metadata: Metadata = { title: 'Embarques' }

// Los embarques (por booking) y los contenedores del origen elegido que quien mira puede ver (`docs/UX.md` › «Logística»): una página por cursor opaco, con sus
// filtros en la URL (`naviera`, `puerto_origen`, `puerto_destino`, `en_transito`, `q`). Sólo las vistas que usa el flujo del origen (`vistasDeTransporte`); la URL
// que pide la otra dice que el origen no la usa. Lo que se ve lo decide la base (`transporte_grupos()` cuenta sólo las unidades visibles); acá sólo se arma el
// pedido y se dibuja. La fila abre el resumen (`?booking=` o `?contenedor=`), que junta la clave en todos los orígenes. Ningún total exacto: lo que se muestra es la fila.
export default function PaginaDeEmbarques({ searchParams }: PageProps<'/logistica/embarques'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Embarques</h1>
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="embarques" />
      </Suspense>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={7} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </div>
  )
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
  const catalogos = datosO(await leerCatalogosDeTransporte())
  const esquema = esquemaDeFiltrosDeGrupos(vista, catalogos)
  const pedido = pedidoDeGrupos(leerFiltros(esquema, parametros), {
    origenId: origen.id,
    vista,
    desde: unParametro(parametros[CLAVE_DE_CURSOR]) ?? null,
  })
  const pagina = datosO(await leerGrupos(pedido))
  const clave = claveDelResumenDe(vista)
  const abierto = unParametro(parametros[clave])
  // El formulario de «Editar grupo» tapa al resumen (D36); sin permiso, `?panel=editar-grupo` se ignora (D37).
  const editando =
    unParametro(parametros[CLAVE_DE_PANEL]) === PANEL_EDITAR_GRUPO &&
    puedeEditarTransporte(permisos)
  return (
    <>
      <ListadoDeEmbarques
        pagina={pagina}
        vista={vista}
        vistas={vistas}
        origenId={origen.id}
        esquema={esquema}
        catalogos={{
          navieras: catalogos.navieras.map((n) => ({ id: n.id, nombre: n.nombre })),
          puertos: catalogos.puertos.map((p) => ({ id: p.id, nombre: p.nombre })),
        }}
        ruta={RUTAS.embarques}
        claveDelResumen={clave}
      />
      {abierto && editando ? (
        <Suspense key={`editar-${vista}-${abierto}`} fallback={<EsqueletoDetalle />}>
          <GrupoEnEdicion clave={abierto} vista={vista} claveDeUrl={clave} />
        </Suspense>
      ) : abierto ? (
        <DrawerDelGrupo clave={clave} vista={vista}>
          <Suspense key={`${vista}-${abierto}`} fallback={<EsqueletoDetalle />}>
            <GrupoAbierto
              clave={abierto}
              vista={vista}
              permisos={permisos}
              claveDeUrl={clave}
              origenId={origen.id}
            />
          </Suspense>
        </DrawerDelGrupo>
      ) : null}
    </>
  )
}
