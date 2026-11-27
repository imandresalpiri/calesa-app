import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import {
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  origenElegido,
  origenesParaCotizar,
  topeDelTituloEnPar,
  type AsesorDeLaTarjeta,
} from '@/modules/cotizaciones'
import {
  CabeceraQuieta,
  EsqueletoDeHoja,
  FormulaSinPublicar,
  PestanasDeOrigen,
  ProveedorDeLaRanuraDeLaCabecera,
  ProveedorDelTitulo,
} from '@/modules/cotizaciones/pantallas/cotizar'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from '@/modules/cotizaciones/pantallas/formula-hoja'
import { ProveedorDeLaEdicionDeLaTabla } from '@/modules/cotizaciones/pantallas/tablas-hoja'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes, type OrigenResumen } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { ConProveedorDeLaHoja } from '../con-proveedor-de-la-hoja'
import { asesorQueMira, oNulo } from '../datos-de-la-tarjeta'
import {
  idDeUrl,
  valoresDelVehiculoDe,
  type Quien,
  type VehiculoDeLaUrl,
} from '../vehiculo-de-la-hoja'
import { BarrasDeLaHoja } from './barras-de-la-hoja'
import { PantallaDeLaHoja } from './pantalla-de-la-hoja'
import { tarjetaDeLaHojaNueva, tituloDelElegido } from './tarjeta-de-la-hoja'
import { TituloDeLaHoja, volverDe } from './volver-de-la-hoja'
import {
  camposQueSeEligen,
  leerLoDeLaHoja,
  paraElegirDe,
  reglasDeLaHoja,
} from './lecturas-de-la-hoja'
import { ocultoEnElLive } from '../../_live/guarda'

// Lo que el área `formula` llena en la hoja (`pantallas/formula-hoja.ts`): el enlace de «Falta publicar la fórmula».
const { EnlaceSinPublicar } = HUECOS_DE_FORMULA_EN_LA_HOJA

export const metadata: Metadata = { title: 'Cotizar' }

// La hoja de cotizar (`docs/UX.md` › «Cotizar»): una pestaña por origen donde la persona cotiza y, de cada uno, la hoja que dibuja su fórmula publicada. `?origen=`
// elige el origen; `?lead=` y `?vehiculo=` llegan de la ficha del lead o del vehículo, o el vehículo se elige en la barra de arriba de la hoja (su panel, `?panel=vehiculo`,
// 4.14-2a): se validan y se llevan. `?returnTo=` (el «Cotizar lead» del «⋯» de un lead) suma «Volver» junto al título. Sin entrada en la navegación todavía: se llega por URL. Guarda con el lead de la URL (4.13-3b); sin él, «Guardar» dice por qué no.
export default function PaginaDeCotizar({ searchParams }: PageProps<'/cotizaciones/nuevo'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <TituloDeLaHoja parametros={searchParams} />
      <Suspense fallback={<EsqueletoDeHoja />}>
        <Hoja parametros={searchParams} />
      </Suspense>
    </div>
  )
}

async function Hoja({
  parametros,
}: {
  parametros: PageProps<'/cotizaciones/nuevo'>['searchParams']
}) {
  const oculto = await ocultoEnElLive('cotizaciones')
  if (oculto) {
    return oculto
  }
  await connection()
  // El asesor de la tarjeta (quien cotiza) se pide ya y se espera junto a las lecturas de la hoja: nunca antes que ellas.
  const asesor = oNulo(asesorQueMira())
  const [sesion, url] = await Promise.all([requerirSesion(), parametros])
  const origenes = origenesParaCotizar(sesion.permisos, datosO(await getOrigenes()))
  const origen = origenElegido(origenes, unParametro(url[CLAVE_DE_ORIGEN]))
  if (!origen) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  return (
    <HojaDelOrigen sesion={sesion} asesor={asesor} url={url} origenes={origenes} origen={origen} />
  )
}

// «Falta publicar la fórmula»: con permiso para configurar, el enlace es el que llena el área `formula` (C7 del 4.15-6).
function SinPublicar({
  origenId,
  hoja,
}: {
  origenId: string
  hoja: { origen: { nombre: string }; puedeConfigurar: boolean }
}) {
  return (
    <FormulaSinPublicar
      origen={hoja.origen.nombre}
      puedeConfigurar={hoja.puedeConfigurar}
      accion={
        hoja.puedeConfigurar && EnlaceSinPublicar ? (
          <EnlaceSinPublicar origenId={origenId} />
        ) : undefined
      }
    />
  )
}

// El título de la cotización (T307) sobre las barras y la hoja, fuera de la `key` de la hoja: cambiar de vehículo o de cliente lo conserva. Va con `key` del origen (otra
// pestaña de origen es otra cotización); su borrador, por el vehículo con que se abrió la hoja, y el automático es el título del elegido.
function ConElTitulo({
  sesion,
  origen,
  elegido,
  tope,
  children,
}: {
  sesion: { usuarioId: string }
  origen: { id: string }
  elegido: VehiculoDeLaUrl
  // En una hoja en par, el título lleva « · <opción>»: su tope es menor.
  tope?: number | undefined
  children: ReactNode
}) {
  return (
    <ProveedorDelTitulo
      deLaPestana={{
        personaId: sesion.usuarioId,
        origenId: origen.id,
        vehiculoAlAbrir: elegido?.vehiculo.id ?? null,
      }}
      vehiculo={tituloDelElegido(elegido)}
      {...(tope === undefined ? {} : { tope })}
    >
      {children}
    </ProveedorDelTitulo>
  )
}

// La hoja del origen elegido, con sus dos barras (vehículo y cliente) y las pestañas de origen.
// En una hoja en par el título lleva « · <opción>»: su tope es menor.
const topeDelTitulo = (hoja: { par?: Parameters<typeof topeDelTituloEnPar>[0] }) =>
  hoja.par ? topeDelTituloEnPar(hoja.par) : undefined

// Lo que se dibuja en lugar de la hoja: sin permiso, el error (sube al `error.tsx` de la pantalla, que ofrece «Reintentar») o «Falta publicar la fórmula».
function SinHoja({
  apertura,
  origenId,
  pestanas,
}: {
  apertura: Exclude<Awaited<ReturnType<typeof leerLoDeLaHoja>>['apertura'], { tipo: 'lista' }>
  origenId: string
  pestanas: ReactNode
}) {
  if (apertura.tipo === 'sin_permiso') {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para cotizar en este origen. Pídeselo a quien administra los roles." />
    )
  }
  if (apertura.tipo === 'error') {
    throw new Error(apertura.error.mensaje)
  }
  return (
    <>
      {pestanas}
      <SinPublicar origenId={origenId} hoja={apertura.hoja} />
    </>
  )
}

// Quien configura el origen edita las tablas de la ayuda desde la hoja (el hueco del área `tablas`); los demás sólo las consultan.
function ConLaEdicionDeLasTablas({
  puedeConfigurar,
  children,
}: {
  puedeConfigurar: boolean
  children: ReactNode
}) {
  return puedeConfigurar ? (
    <ProveedorDeLaEdicionDeLaTabla>{children}</ProveedorDeLaEdicionDeLaTabla>
  ) : (
    children
  )
}

async function HojaDelOrigen({
  sesion,
  asesor,
  url,
  origenes,
  origen,
}: {
  sesion: Quien & { permisos: Permisos }
  // El asesor de la tarjeta: quien cotiza (su nombre, su WhatsApp, su cargo y su foto), ya pedido.
  asesor: Promise<AsesorDeLaTarjeta | null>
  url: Awaited<PageProps<'/cotizaciones/nuevo'>['searchParams']>
  origenes: readonly OrigenResumen[]
  origen: OrigenResumen
}) {
  const lead = idDeUrl(url[CLAVE_DE_LEAD])
  const vehiculo = idDeUrl(url[CLAVE_DE_VEHICULO])
  const [
    { apertura, vehiculoSoltado, leido, conteo, alta, layout, cliente, inicialDeLaSegunda },
    elAsesor,
  ] = await Promise.all([leerLoDeLaHoja(sesion, origen, { lead, vehiculo }), asesor])
  // Un lead que no se ve se suelta, como el vehículo: ni la hoja ni las pestañas de origen lo llevan.
  const leadUsado = cliente?.id ?? null
  const dePestanas = { origenes, actual: origen.id, leadId: leadUsado, volverA: volverDe(url) }
  const pestanas = <PestanasDeOrigen {...dePestanas} />
  if (apertura.tipo !== 'lista') {
    return <SinHoja apertura={apertura} origenId={origen.id} pestanas={pestanas} />
  }
  const vehiculoUsado = vehiculoSoltado ? null : vehiculo
  const elegido = vehiculoSoltado ? null : leido
  const paraElegir = paraElegirDe(apertura.hoja, elegido, layout)
  const { obligatorios, elecciones } = reglasDeLaHoja(sesion.permisos, origen.id)
  return (
    <>
      {pestanas}
      <ConElTitulo
        key={origen.id}
        sesion={sesion}
        origen={origen}
        elegido={elegido}
        tope={topeDelTitulo(apertura.hoja)}
      >
        <ProveedorDeLaRanuraDeLaCabecera>
          <BarrasDeLaHoja
            sesion={sesion}
            origen={origen}
            elegido={elegido}
            cliente={cliente}
            reglas={{ obligatorios, conteo, alta, paraElegir, abierta: apertura.hoja.abierta }}
            reservaDeLaCabecera={<CabeceraQuieta cabecera={apertura.hoja.cabecera} />}
          />
          <ConProveedorDeLaHoja
            origenId={origen.id}
            cotizacionId={null}
            permisos={sesion.permisos}
            tarjeta={tarjetaDeLaHojaNueva({ elegido, cliente, asesor: elAsesor })}
          >
            <ConLaEdicionDeLasTablas
              puedeConfigurar={puede(sesion.permisos, 'cotizaciones.configurar', origen.id)}
            >
              <PantallaDeLaHoja
                key={`${origen.id}:${leadUsado ?? '-'}:${vehiculoUsado ?? '-'}`}
                hoja={apertura.hoja}
                iniciales={[apertura.inicial, inicialDeLaSegunda]}
                vehiculoId={vehiculoUsado}
                vehiculoSoltado={vehiculoSoltado}
                leadId={leadUsado}
                obligatorios={obligatorios}
                elecciones={elecciones}
                personaId={sesion.usuarioId}
                // La celda sin valor por un dato que quien mira elige en el panel dice dónde se elige (4.14-2c3).
                seEligen={camposQueSeEligen(paraElegir)}
                valoresDelVehiculo={valoresDelVehiculoDe(apertura.hoja, elegido?.vehiculo ?? null)}
              />
            </ConLaEdicionDeLasTablas>
          </ConProveedorDeLaHoja>
        </ProveedorDeLaRanuraDeLaCabecera>
      </ConElTitulo>
    </>
  )
}
