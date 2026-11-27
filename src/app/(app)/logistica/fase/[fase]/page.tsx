import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { leerFasesDeOrigen } from '@/modules/flujos'
import {
  claveDeFase,
  enElOrigen,
  codificarCursorDeLaFase,
  esquemaDeFiltrosDeLaCadena,
  faseDeLaClave,
  leerCursorDeLaFase,
  leerLaFase,
  leerNavieras,
  pedidoDeLaCadena,
  type OrigenDeLaCadena,
} from '@/modules/logistica'
import { EsqueletoDeLaFase } from '@/modules/logistica/pantallas/cadena-esqueletos'
import {
  EncabezadoDeLaFase,
  EstadoDeLaGrafica,
  ListaDeLaFase,
} from '@/modules/logistica/pantallas/cadena-fase'
import {
  BarraDelLote,
  DrawerDelLote,
  ProveedorDeLaSeleccion,
} from '@/modules/logistica/pantallas/mover'
import { CLAVE_DE_CURSOR, leerFiltros } from '@/shared/lib/filtros'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { abrirLaPestana } from '../../abrir-la-pestana'
import { BarraDeLogistica } from '../../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../../esqueleto-de-la-barra'
import { MarcasDeLogistica } from '../../marcas-de-logistica'

export const metadata: Metadata = { title: 'Fase · Logística' }

type Parametros = Record<string, string | string[] | undefined>
type FaseDeLaLista = { id: string; nombre: string; activa: boolean }

// `/logistica/fase/[fase]`: la lista de una fase de la cadena (`[fase]` es el id de la fase o `sin_fase`), de a `TAMANO_DE_LA_FASE` por cursor, con los filtros de siempre en la URL, la búsqueda y,
// si quien mira puede mover, la selección del lote (hasta 200). Clic en un vehículo lleva a su página, nunca a un drawer. El origen sale de `?origen=` (uno que la
// persona no ve dice «sin permiso») o es el último que usó; en la barra, otro origen abre su Cadena.
export default function PaginaDeUnaFase({
  params,
  searchParams,
}: PageProps<'/logistica/fase/[fase]'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="cadena" />
      </Suspense>
      <Suspense fallback={<EsqueletoDeLaFase />}>
        <Fase params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function YaNoEsta({ hrefDeLaCadena }: { hrefDeLaCadena: string }) {
  return (
    <EstadoVacio
      titulo="Esta fase ya no está en la cadena de este origen."
      accion={
        <Link href={hrefDeLaCadena as Route} className={buttonVariants({ variant: 'outline' })}>
          Ver la cadena
        </Link>
      }
    />
  )
}

async function Fase({
  params,
  searchParams,
}: Pick<PageProps<'/logistica/fase/[fase]'>, 'params' | 'searchParams'>) {
  const abierta = await abrirLaPestana(searchParams, 'cadena')
  if (abierta.tipo === 'estado') return abierta.estado
  const { permisos, origen, origenes, parametros } = abierta
  const { fase: clave } = await params
  const hrefDeLaCadena = enElOrigen(RUTAS.logistica, origen.id)
  const destino = faseDeLaClave(clave)
  if (destino === null) return <YaNoEsta hrefDeLaCadena={hrefDeLaCadena} />
  return (
    <LaFase
      origen={origen}
      conVariosOrigenes={origenes.length > 1}
      faseId={destino.faseId}
      parametros={parametros}
      permisos={permisos}
      hrefDeLaCadena={hrefDeLaCadena}
    />
  )
}

// La fase del flujo del origen (también una jubilada: sigue nombrando lo que quedó ahí). «Sin fase» no es una fase del flujo. Nulo si ya no está; `error` si no se pudo leer.
async function buscarLaFase(
  origenId: string,
  faseId: string,
): Promise<FaseDeLaLista | 'error' | null> {
  const fases = await leerFasesDeOrigen(origenId)
  if (!fases.ok) return 'error'
  const encontrada = fases.data.find((f) => f.id === faseId)
  return encontrada === undefined
    ? null
    : { id: encontrada.id, nombre: encontrada.nombre, activa: encontrada.activa }
}

const puedeMoverEn = (permisos: Permisos, origenId: string) =>
  puede(permisos, 'flujos.mover', origenId) || puede(permisos, 'flujos.mover.cualquiera', origenId)

// La página de la lista (con los filtros y el cursor de la URL) y el cursor de la que sigue; nulo si no se pudo leer. El cursor es el último leído: `(fase_desde, id)` en una fase, sólo `id` en
// «Sin fase».
async function leerLaPagina({
  origenId,
  faseId,
  parametros,
}: {
  origenId: string
  faseId: string | null
  parametros: Parametros
}) {
  const navieras = await leerNavieras(origenId)
  const esquema = esquemaDeFiltrosDeLaCadena({ navieras: navieras.ok ? navieras.data : [] })
  const filtros = pedidoDeLaCadena(leerFiltros(esquema, parametros))
  const cursor = leerCursorDeLaFase(unParametro(parametros[CLAVE_DE_CURSOR]), {
    sinFase: faseId === null,
  })
  const leida = await leerLaFase({ origenId, faseId, cursor, filtros })
  if (!leida.ok) return null
  const ultimo = leida.data.vehiculos.at(-1)
  const siguiente =
    leida.data.hayMas && ultimo !== undefined && (faseId === null || ultimo.faseDesde !== null)
      ? codificarCursorDeLaFase({ desde: faseId === null ? null : ultimo.faseDesde, id: ultimo.id })
      : null
  return { pagina: leida.data, siguiente, esquema, filtros }
}

// La fase de la lista: nula en «Sin fase» (no es una fase del flujo); `ya_no_esta` si el flujo ya no la tiene; `error` si no se pudo leer.
async function faseDeLaLista(
  origenId: string,
  faseId: string | null,
): Promise<FaseDeLaLista | 'error' | 'ya_no_esta' | null> {
  if (faseId === null) return null
  return (await buscarLaFase(origenId, faseId)) ?? 'ya_no_esta'
}

async function LaFase({
  origen,
  conVariosOrigenes,
  faseId,
  parametros,
  permisos,
  hrefDeLaCadena,
}: {
  origen: OrigenDeLaCadena
  conVariosOrigenes: boolean
  faseId: string | null
  parametros: Parametros
  permisos: Permisos
  hrefDeLaCadena: string
}) {
  const fase = await faseDeLaLista(origen.id, faseId)
  if (fase === 'error') return <EstadoDeLaGrafica tipo="error" />
  if (fase === 'ya_no_esta') return <YaNoEsta hrefDeLaCadena={hrefDeLaCadena} />
  const leida = await leerLaPagina({ origenId: origen.id, faseId, parametros })
  if (leida === null) return <EstadoDeLaGrafica tipo="error" />
  const { pagina, siguiente, esquema, filtros } = leida

  const lectura = (
    <MarcasDeLogistica ids={pagina.vehiculos.map((vehiculo) => vehiculo.id)}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <EncabezadoDeLaFase
          nombre={fase?.nombre ?? 'Sin fase'}
          jubilada={fase !== null && !fase.activa}
          hrefDeLaCadena={hrefDeLaCadena}
          origen={conVariosOrigenes ? origen.nombre : null}
        />
        <ListaDeLaFase
          vehiculos={pagina.vehiculos}
          siguiente={siguiente}
          esquema={esquema}
          fase={fase === null ? null : { id: fase.id, nombre: fase.nombre }}
          ahora={new Date().toISOString()}
          hrefDeLaCadena={hrefDeLaCadena}
        />
      </div>
    </MarcasDeLogistica>
  )
  // La selección del lote sólo con `flujos.mover` en el origen y en una fase de verdad; la base vuelve a decidir al mover.
  if (fase === null || !puedeMoverEn(permisos, origen.id)) return lectura
  return (
    <ProveedorDeLaSeleccion
      origenId={origen.id}
      firmaDelPedido={`${claveDeFase(faseId)}|${JSON.stringify(filtros)}`}
    >
      {lectura}
      <BarraDelLote />
      <DrawerDelLote origenId={origen.id} />
    </ProveedorDeLaSeleccion>
  )
}
