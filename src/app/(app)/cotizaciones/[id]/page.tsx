import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import {
  CLAVE_DE_VEHICULO,
  leerHojaDeUnaGuardada,
  type HojaDeUnaGuardada,
} from '@/modules/cotizaciones'
import {
  CabeceraDeLaGuardada,
  CabeceraQuieta,
  EsqueletoDeHoja,
  ProveedorDeLaRanuraDeLaCabecera,
  ProveedorDelMenuDeLaGuardada,
} from '@/modules/cotizaciones/pantallas/cotizacion'
import { origenVisibleEnElLive, requerirSesion } from '@/modules/equipo'
import { RegistrarVisto } from '@/modules/equipo/pantallas/visto-de-la-ficha'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoOcultoEnLive, EstadoVacio } from '@/shared/ui/estados'
import { ConProveedorDeLaHoja } from '../con-proveedor-de-la-hoja'
import {
  asesorQueMira,
  clienteDe,
  tituloDeLaTarjeta,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../datos-de-la-tarjeta'
import { idDeUrl, valoresDelVehiculoDe, type Quien } from '../vehiculo-de-la-hoja'
import { HUECOS_DE_LA_GUARDADA, dibujarHuecos } from './huecos-de-la-guardada'
import { HojaDeLaGuardada, LaHermana } from './hoja-de-la-guardada'
import { esHermanaSola, leerElParDeLaGuardada } from './par-de-la-guardada'
import { VolverALaFicha } from './volver-a-la-ficha'
import { barraDeLaCabecera, ConElTituloDeLaGuardada } from './titulo-de-la-guardada'
import { leerLoDelVehiculo } from './vehiculo-de-la-guardada'
import { SiSeVeEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Cotización' }

// Una cotización guardada (`docs/UX.md` › «Cotizar»): su hoja con lo que se guardó, en sólo lectura para quien no la puede guardar (`cotizaciones.ver`; P8, P13). Se llega desde el
// historial del vehículo y desde la tarjeta de lo guardado. `?vehiculo=` es el vehículo elegido en el panel para cambiar el de una preventa (T315): la hoja calcula con él.
export default function PaginaDeUnaCotizacion({
  params,
  searchParams,
}: PageProps<'/cotizaciones/[id]'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense fallback={<EsqueletoDeHoja />}>
        <SiSeVeEnElLive area="cotizaciones">
          <Cotizacion params={params} searchParams={searchParams} />
        </SiSeVeEnElLive>
      </Suspense>
    </div>
  )
}

// Lo que no existe, lo que está en la papelera y lo que quien mira no ve se dicen igual: decir «no tienes permiso» confirmaría que existe (como el vehículo).
function NoDisponible() {
  return (
    <EstadoVacio titulo="Esta cotización ya no está disponible: no existe o ya no tienes acceso." />
  )
}

// Lo que la página lee con la hoja ya leída: el cliente y el vehículo sólo se nombran si quien mira los ve (los ids salen de la lectura, así que van después de ella), el asesor
// y, a la vez, lo del vehículo para cambiarlo (T315). `deLaHoja` es el vehículo de la barra, del título y del cálculo: el elegido para cambiarlo o el guardado; la tarjeta,
// el PDF, los huecos y la cabecera siguen con lo guardado (`vehiculo`).
async function leerAlrededor(
  sesion: Quien,
  lectura: { hoja: HojaDeUnaGuardada; vehiculoNuevo: string | null; vehiculoSoltado: boolean },
  hermanaSola: boolean,
) {
  const { hoja, vehiculoNuevo, vehiculoSoltado } = lectura
  const [cliente, vehiculo, asesor, delVehiculo] = await Promise.all([
    clienteDe(sesion.permisos, hoja.cotizacion.leadId),
    vehiculoDe(hoja.cotizacion.vehiculoId),
    asesorQueMira(),
    leerLoDelVehiculo(sesion, hoja, { vehiculoNuevo, vehiculoSoltado, hermanaSola }),
  ])
  if (vehiculoNuevo !== null && delVehiculo.nuevo === null) {
    // La hoja calculó con el elegido pero su lectura no llegó (un fallo, o se fue a la papelera entre las dos): la barra y el título nombrarían el de antes con el total
    // del nuevo. Sube al `error.tsx`: «Reintentar» vuelve a leer y, si ya no se puede usar, la base lo suelta.
    throw new Error('No pudimos leer el vehículo elegido.')
  }
  return {
    cliente,
    vehiculo,
    asesor,
    delVehiculo,
    deLaHoja: delVehiculo.nuevo?.vehiculo ?? vehiculo,
  }
}

// Lo que sólo la página sabe de la tarjeta de «Vista previa»: lo guardado (título, número, vencimiento, último guardado), el cliente y el vehículo si quien
// mira los ve, el asesor y los retoques con si quien mira la puede retocar (`puede_guardar` de la base).
function tarjetaDeLaGuardada(
  hoja: HojaDeUnaGuardada,
  {
    cliente,
    vehiculo,
    asesor,
  }: Pick<Awaited<ReturnType<typeof leerAlrededor>>, 'cliente' | 'vehiculo' | 'asesor'>,
) {
  return {
    titulo: tituloDeLaTarjeta(hoja.cotizacion, vehiculo),
    cliente: cliente?.nombre ?? null,
    vehiculo: vehiculoDeLaTarjeta(vehiculo),
    asesor,
    numero: hoja.cotizacion.numero,
    vencida: hoja.vencida,
    venceEl: hoja.venceEl,
    guardadaEl: hoja.cotizacion.actualizadoEn,
    retoque: {
      retoques: hoja.cotizacion.tarjetaRetoques,
      actualizadoEn: hoja.cotizacion.actualizadoEn,
      puedeRetocar: hoja.puedeGuardar,
    },
  }
}

// Lo que reciben los huecos de las áreas (las líneas del «⋯» de la cabecera, sus insignias, la línea de bajo la cabecera y lo de bajo la hoja); el vehículo, sólo si quien mira lo ve.
function propsDeLosHuecos(
  hoja: Pick<HojaDeUnaGuardada, 'cotizacion' | 'puedeGuardar'>,
  permisos: Permisos,
  vehiculo: { id: string; titulo: string } | null,
) {
  return {
    cotizacion: hoja.cotizacion,
    puedeGuardar: hoja.puedeGuardar,
    permisos,
    vehiculo: vehiculo === null ? null : { id: vehiculo.id, titulo: vehiculo.titulo },
  }
}

// La cabecera quieta que la ranura muestra antes de hidratar, con el modo y «Ver total» de la guardada.
function reservaDeLaCabecera(hoja: HojaDeUnaGuardada) {
  return (
    <CabeceraQuieta
      cabecera={hoja.diseno.cabecera}
      modoElegido={hoja.cotizacion.modoTc}
      verTotalBs={hoja.cotizacion.verTotalBs}
      deshabilitado={!hoja.puedeGuardar}
    />
  )
}

async function Cotizacion({
  params,
  searchParams,
}: Pick<PageProps<'/cotizaciones/[id]'>, 'params' | 'searchParams'>) {
  await connection()
  const [sesion, { id }, url] = await Promise.all([requerirSesion(), params, searchParams])
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const lectura = await leerHojaDeUnaGuardada(id, { vehiculo: idDeUrl(url[CLAVE_DE_VEHICULO]) })
  if (!lectura.ok) {
    if (lectura.error.codigo === 'sin_permiso') {
      return <NoDisponible />
    }
    // Sube al `error.tsx` de la pantalla, que ofrece «Reintentar».
    throw new Error(lectura.error.mensaje)
  }
  const { hoja } = lectura.data
  // Con el Modo Live y un origen que no muestra: la pantalla oculta, antes de leer lo de alrededor y sin registrar la visita.
  if (!origenVisibleEnElLive(sesion.live, hoja.cotizacion.origenId)) {
    return <EstadoOcultoEnLive />
  }
  const [{ cliente, vehiculo, asesor, delVehiculo, deLaHoja }, delPar] = await Promise.all([
    leerAlrededor(sesion, lectura.data, esHermanaSola(hoja)),
    leerElParDeLaGuardada(lectura.data, idDeUrl(url[CLAVE_DE_VEHICULO])),
  ])
  const props = propsDeLosHuecos(hoja, sesion.permisos, vehiculo)
  return (
    <>
      <RegistrarVisita tipo="cotizacion" id={hoja.cotizacion.id} />
      <RegistrarVisto modulo="cotizaciones" tipo="cotizacion" id={hoja.cotizacion.id} />
      <VolverALaFicha parametros={url} />
      <ProveedorDelMenuDeLaGuardada>
        <ProveedorDeLaRanuraDeLaCabecera>
          <ConElTituloDeLaGuardada
            hoja={hoja}
            personaId={sesion.usuarioId}
            vehiculo={deLaHoja}
            par={hoja.diseno.par}
          >
            <ConProveedorDeLaHoja
              origenId={hoja.cotizacion.origenId}
              cotizacionId={hoja.cotizacion.id}
              permisos={sesion.permisos}
              tarjeta={tarjetaDeLaGuardada(hoja, { cliente, vehiculo, asesor })}
            >
              <CabeceraDeLaGuardada
                id={hoja.cotizacion.id}
                numero={hoja.cotizacion.numero}
                clase={hoja.cotizacion.clase}
                actualizadoEn={hoja.cotizacion.actualizadoEn}
                version={hoja.cotizacion.version}
                cadena={hoja.cadena}
                venceEl={hoja.venceEl}
                vencida={hoja.vencida}
                origen={hoja.diseno.origen.nombre}
                cliente={cliente?.nombre ?? null}
                vehiculo={vehiculo?.titulo ?? null}
                barra={barraDeLaCabecera(hoja, deLaHoja, delVehiculo, sesion.permisos)}
                guardable={hoja.puedeGuardar}
                reservaDeLaCabecera={reservaDeLaCabecera(hoja)}
                acciones={dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Acciones', props)}
                insignias={dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Insignias', props)}
                privada={hoja.cotizacion.privada === true}
              />
              <LaHermana hoja={hoja} delPar={delPar} />
              {dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'BajoLaCabecera', props)}
              <HojaDeLaGuardada
                lectura={lectura.data}
                delPar={delPar}
                personaId={sesion.usuarioId}
                cambio={delVehiculo.cambio}
                valoresDelVehiculo={valoresDelVehiculoDe(hoja.diseno, deLaHoja)}
              />
            </ConProveedorDeLaHoja>
          </ConElTituloDeLaGuardada>
        </ProveedorDeLaRanuraDeLaCabecera>
      </ProveedorDelMenuDeLaGuardada>
      {dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Debajo', props)}
    </>
  )
}
