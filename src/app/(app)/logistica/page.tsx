import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  buscaEnTodos,
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_DONDE_BUSCAR,
  dondeEsta,
  leerResumenDeLaCadena,
  MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
  rutaDeDondeEsta,
  type OrigenDeLaCadena,
} from '@/modules/logistica'
import {
  BuscadorDeDondeEsta,
  EstadoDeLaGrafica,
  FranjaDeDondeEsta,
  GraficaDeLaCadena,
} from '@/modules/logistica/pantallas/cadena'
import { EsqueletoDeLaGrafica } from '@/modules/logistica/pantallas/cadena-esqueletos'
import { DrawerDelLote, ProveedorDeLaSeleccion } from '@/modules/logistica/pantallas/mover'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { rutaDeParteDelOrigen, unParametro } from '@/shared/lib/rutas'
import { abrirLaPestana } from './abrir-la-pestana'
import { BarraDeLogistica } from './barra-de-logistica'
import { EsqueletoDeLaBarra } from './esqueleto-de-la-barra'
import { MarcasDeLogistica } from './marcas-de-logistica'
import { SiSeVeEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Logística' }

// `/logistica`: la Cadena del origen elegido (sin `?origen=`, el último que usó la persona): la gráfica (una línea con una fase por punto: cuántos vehículos tiene
// y cuántos están demorados o trabados) y «Dónde está» en ese origen, con «Buscar en todos los orígenes» (`?en=todos`). Clic en una fase lleva a su lista
// (`/logistica/fase/[fase]`) y clic en un vehículo, a su página (`/logistica/vehiculo/[id]`): nunca un drawer. Con `?panel=lote` («Mover el contenedor») se
// abre el lote de un contenedor o un embarque. La bandeja del día es su propia pestaña (`/logistica/bandeja`).
export default function PaginaDeLogistica({ searchParams }: PageProps<'/logistica'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso. Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Logística</h1>
      <SiSeVeEnElLive area="logistica.cadena">
        <Suspense fallback={<EsqueletoDeLaBarra />}>
          <BarraDeLogistica searchParams={searchParams} pestana="cadena" />
        </Suspense>
        <Suspense fallback={<EsqueletoDeLaGrafica />}>
          <Cadena searchParams={searchParams} />
        </Suspense>
      </SiSeVeEnElLive>
    </div>
  )
}

// `?panel=lote` («Mover el contenedor») abre el lote de un contenedor o un embarque, por su id; sólo se arma con `flujos.mover` en el origen y la base vuelve a decidir al mover.
function pideElLote(
  parametros: Record<string, string | string[] | undefined>,
  permisos: Permisos,
  origenId: string,
): boolean {
  return (
    unParametro(parametros['panel']) === 'lote' &&
    (puede(permisos, 'flujos.mover', origenId) ||
      puede(permisos, 'flujos.mover.cualquiera', origenId))
  )
}

async function Cadena({ searchParams }: Pick<PageProps<'/logistica'>, 'searchParams'>) {
  const abierta = await abrirLaPestana(searchParams, 'cadena')
  if (abierta.tipo === 'estado') return abierta.estado
  const { permisos, origen, origenes, parametros } = abierta

  const q = (unParametro(parametros[CLAVE_DE_BUSQUEDA_DE_LA_CADENA]) ?? '').trim().slice(0, 100)
  const buscando = cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_LA_CADENA)
  const enTodos = buscaEnTodos(unParametro(parametros[CLAVE_DE_DONDE_BUSCAR]))

  const cadena = (
    <section
      aria-label={`La cadena de ${origen.nombre}`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"
    >
      <BuscadorDeDondeEsta origenId={origen.id} q={q} enTodos={enTodos} />
      {buscando ? (
        <>
          <OtroAlcance origen={origen} q={q} enTodos={enTodos} hayOtros={origenes.length > 1} />
          <Suspense key={`${q}|${String(enTodos)}`} fallback={null}>
            <DondeEsta q={q} origen={origen} origenes={enTodos ? origenes : null} />
          </Suspense>
        </>
      ) : q !== '' ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MINIMO_DE_BUSQUEDA_DE_LA_CADENA.aviso}
        </p>
      ) : null}
      <Suspense
        // Otro origen es otra gráfica: nada de la anterior se arrastra.
        key={origen.id}
        fallback={<EsqueletoDeLaGrafica />}
      >
        <CadenaDelOrigen
          origenId={origen.id}
          enlaceAFlujos={puede(permisos, 'flujos.configurar', origen.id)}
        />
      </Suspense>
    </section>
  )
  // El lote de un grupo (`?panel=lote&contenedor=…`) sólo se arma con `flujos.mover` en el origen; la base vuelve a decidir al mover.
  if (!pideElLote(parametros, permisos, origen.id)) return cadena
  return (
    <ProveedorDeLaSeleccion origenId={origen.id} firmaDelPedido="lote">
      {cadena}
      <DrawerDelLote origenId={origen.id} />
    </ProveedorDeLaSeleccion>
  )
}

// La salida a buscar en todos los orígenes (o, ya ahí, a volver al elegido). Con un solo origen no hay a dónde ir.
function OtroAlcance({
  origen,
  q,
  enTodos,
  hayOtros,
}: {
  origen: OrigenDeLaCadena
  q: string
  enTodos: boolean
  hayOtros: boolean
}) {
  if (!hayOtros) return null
  return (
    <Link
      href={rutaDeDondeEsta(origen.id, q, !enTodos) as Route}
      className="inline-flex min-h-11 w-fit items-center text-(length:--text-sm) text-(--color-primario) underline-offset-2 hover:underline md:min-h-8"
    >
      {enTodos ? `Buscar sólo en ${origen.nombre}` : 'Buscar en todos los orígenes'}
    </Link>
  )
}

// Dónde está lo que se busca, en el origen o (con `origenes`) en todos los de la persona. Si no se puede comprobar, lo dice sin tumbar la Cadena.
async function DondeEsta({
  q,
  origen,
  origenes,
}: {
  q: string
  origen: OrigenDeLaCadena
  origenes: OrigenDeLaCadena[] | null
}) {
  await connection()
  const donde = await dondeEsta(q, origenes === null ? origen.id : null)
  const franja = (
    <FranjaDeDondeEsta
      resultado={donde.ok ? donde.data : null}
      ahora={new Date()}
      origenes={origenes === null ? null : new Map(origenes.map((o) => [o.id, o.nombre]))}
    />
  )
  // Hasta 10 vehículos: su «visto» es el de `/logistica/vehiculo/[id]`.
  return donde.ok ? (
    <MarcasDeLogistica ids={donde.data.unidades.map((unidad) => unidad.id)}>
      {franja}
    </MarcasDeLogistica>
  ) : (
    franja
  )
}

// La gráfica de un origen. Si falla la lectura, el error con «Reintentar»; un origen sin fases dice dónde configurarlas.
async function CadenaDelOrigen({
  origenId,
  enlaceAFlujos,
}: {
  origenId: string
  enlaceAFlujos: boolean
}) {
  const resumen = await leerResumenDeLaCadena(origenId)
  if (!resumen.ok) {
    return <EstadoDeLaGrafica tipo="error" />
  }
  if (resumen.data.fases.length === 0) {
    return (
      <EstadoDeLaGrafica
        tipo="sin_fases"
        enlaceAlFlujo={enlaceAFlujos ? rutaDeParteDelOrigen(origenId, 'fases') : undefined}
      />
    )
  }
  return <GraficaDeLaCadena resumen={resumen.data} origenId={origenId} />
}
