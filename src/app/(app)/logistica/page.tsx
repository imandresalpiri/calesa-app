import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
  CLAVE_DE_ORIGEN_DE_LA_CADENA,
  dondeEsta,
  leerResumenDeLaCadena,
  MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
  type OrigenDeLaCadena,
} from '@/modules/logistica'
import {
  BuscadorDeDondeEsta,
  EstadoDeLaGrafica,
  FranjaDeDondeEsta,
  GraficaDeLaCadena,
  PestanasDeOrigen,
} from '@/modules/logistica/pantallas/cadena'
import { EsqueletoDeLaBandeja } from '@/modules/logistica/pantallas/alertas-esqueletos'
import { EsqueletoDeLaGrafica } from '@/modules/logistica/pantallas/cadena-esqueletos'
import { DrawerDelLote, ProveedorDeLaSeleccion } from '@/modules/logistica/pantallas/mover'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { redirigir } from '@/shared/lib/navegacion'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDeParteDelOrigen, unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { BandejaDeLaPortada } from './bandeja-del-dia'
import { MarcasDeLogistica } from './marcas-de-logistica'
import { resolverElOrigen } from './origen-de-la-cadena'
import { destinoDeLaUrlVieja } from './url-vieja'

export const metadata: Metadata = { title: 'Logística' }

// `/logistica`: lo primero es la bandeja del día (lo que le toca hoy a quien mira, por grupos y con su acción) y al lado la cadena como gráfica (una línea con una fase por punto: cuántos vehículos tiene y cuántos están demorados o trabados), las pestañas de origen y «dónde está» en todos los
// orígenes de la persona. Clic en una fase lleva a la lista de esa fase (`/logistica/fase/[fase]`) y clic en un vehículo, a su página (`/logistica/vehiculo/[id]`): nunca un drawer. Entra
// quien tiene `logistica.ver` en algún origen; lo que se ve de cada origen lo decide la base. Con `?panel=lote` (el enlace de «Mover el grupo») se abre el lote de un contenedor o un booking.
export default function PaginaDeLogistica({ searchParams }: PageProps<'/logistica'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso. Sin cabecera visible: la ocupan las pestañas de origen. */}
      <h1 className="sr-only">Logística</h1>
      <Suspense fallback={<EsqueletoDeLaGrafica />}>
        <Portada searchParams={searchParams} />
      </Suspense>
    </>
  )
}

// `?panel=lote` (el enlace de «Mover el grupo») abre el lote de un contenedor o un booking; sólo se arma con `flujos.mover` en el origen y la base vuelve a decidir al mover.
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

// La sección de la cadena: las pestañas de origen, «dónde está» y la gráfica del origen elegido.
function LaCadena({
  origen,
  origenes,
  fallaron,
  q,
  buscando,
  enlaceAFlujos,
}: {
  origen: OrigenDeLaCadena
  origenes: OrigenDeLaCadena[]
  fallaron: number
  q: string
  buscando: boolean
  enlaceAFlujos: boolean
}) {
  return (
    <section
      id="cadena"
      aria-labelledby="cadena-titulo"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"
    >
      <h2 id="cadena-titulo" className="text-(length:--text-lg) font-semibold text-(--color-ink)">
        La cadena
      </h2>
      <PestanasDeOrigen origenes={origenes} actual={origen.id} />
      {fallaron > 0 ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {fallaron === 1
            ? 'No se pudo comprobar 1 origen.'
            : `No se pudo comprobar ${String(fallaron)} orígenes.`}
        </p>
      ) : null}
      <BuscadorDeDondeEsta origenId={origen.id} q={q} />
      {buscando ? (
        <Suspense key={q} fallback={null}>
          <DondeEsta q={q} />
        </Suspense>
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
        <CadenaDelOrigen origenId={origen.id} enlaceAFlujos={enlaceAFlujos} />
      </Suspense>
    </section>
  )
}

async function Portada({
  searchParams,
}: {
  searchParams: PageProps<'/logistica'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const { permisos } = sesion
  if (!puede(permisos, 'logistica.ver')) {
    return <EstadoSinPermiso />
  }
  const destino = destinoDeLaUrlVieja(parametros)
  if (destino !== null) {
    redirigir(destino)
  }

  const resuelto = await resolverElOrigen(
    permisos,
    unParametro(parametros[CLAVE_DE_ORIGEN_DE_LA_CADENA]),
    {
      estricto: false,
    },
  )
  if (resuelto.tipo !== 'ok') {
    return <EstadoDeLaGrafica tipo={resuelto.tipo === 'error' ? 'error' : 'sin_origenes'} />
  }
  const { origen, origenes, fallaron } = resuelto

  const q = (unParametro(parametros[CLAVE_DE_BUSQUEDA_DE_LA_CADENA]) ?? '').trim().slice(0, 100)
  const buscando = cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_LA_CADENA)
  // El lote de un grupo (`?panel=lote&contenedor=…`) sólo se arma con `flujos.mover` en el origen; la base vuelve a decidir al mover.
  const conLote = pideElLote(parametros, permisos, origen.id)

  const contenido = (
    <LaCadena
      origen={origen}
      origenes={origenes}
      fallaron={fallaron}
      q={q}
      buscando={buscando}
      enlaceAFlujos={puede(permisos, 'flujos.configurar')}
    />
  )
  const portada = (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Suspense fallback={<EsqueletoDeLaBandeja />}>
        <BandejaDeLaPortada permisos={permisos} />
      </Suspense>
      {contenido}
    </div>
  )
  if (!conLote) return portada
  return (
    <ProveedorDeLaSeleccion origenId={origen.id} firmaDelPedido="lote">
      {portada}
      <DrawerDelLote origenId={origen.id} />
    </ProveedorDeLaSeleccion>
  )
}

// Dónde está lo que se busca, en todos los orígenes de la persona. Si no se puede comprobar, lo dice sin tumbar la portada.
async function DondeEsta({ q }: { q: string }) {
  await connection()
  const donde = await dondeEsta(q)
  const franja = <FranjaDeDondeEsta resultado={donde.ok ? donde.data : null} ahora={new Date()} />
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
