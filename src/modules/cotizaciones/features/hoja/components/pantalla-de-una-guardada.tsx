'use client'

import { useMemo, useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../entities/apertura'
import { calculoDeLoGuardado } from '../../../entities/calculo-de-la-tarjeta'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { claveDelBorradorDeUnaGuardada } from '../../../entities/claves-de-la-hoja'
import { entradasDeLoGuardado } from '../../../entities/entradas-de-lo-guardado'
import {
  difiereAlAbrir,
  hojaSinAbierta,
  muestraElTotalGuardado,
  type HojaDeUnaGuardada,
} from '../../../entities/hoja-de-una-guardada'
import { AvisoDeVersion } from '../../encima/components/aviso-de-version'
import { PrivadaDelMenu } from '../../privada/components/privada-del-menu'
import { useGuardadoDeUnaGuardada } from '../hooks/use-guardado-de-una-guardada'
import { useLecturaDeUnaGuardada } from '../hooks/use-lectura-de-una-guardada'
import { useTituloDeLaCotizacion } from '../hooks/use-titulo-de-la-cotizacion'
import { useSoltarElVehiculo } from '../hooks/use-vehiculo-en-la-url'
import type { AperturaDeHoja } from '../hooks/use-hoja'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { TotalGuardado } from './total-guardado'

type PropsDeLaHoja = {
  hoja: HojaDeUnaGuardada
  // El primer cálculo, por la cotización y con lo guardado como entradas: lo hizo el servidor con la lectura (C3).
  inicial: RecalculoInicial
  // El vehículo elegido para cambiar el de una preventa (T315, `?vehiculo=`), con el que se hizo ese cálculo; nulo = el suyo. Va con la hoja: se congela mientras guarda.
  vehiculoNuevo: string | null
  // Los datos del vehículo de la hoja (el elegido o el suyo) con que casa una tabla de la ayuda («Tu vehículo»); sin él, o si quien mira no lo ve, no viajan.
  valoresDelVehiculo?: Readonly<Record<string, number | string>>
}

type Props = PropsDeLaHoja & {
  // Quien mira: el pendiente y el borrador de la pestaña son suyos (otra cuenta en la misma pestaña no reenvía ni repone lo de ésta).
  personaId: string
  // Quien mira puede elegir otro vehículo (una preventa que guarda, `cambioDeVehiculo()`): el rechazo de uno que ya no se usa ofrece elegir otro.
  cambiaVehiculo: boolean
  // El panel donde se escribe el título (el del vehículo, `?panel=vehiculo`): el nombre lo pasa `src/app`. Sin él, sin vehículo y sin título «Guardar» sólo dice qué falta.
  panelDelTitulo?: string
}

// Lo que dice lo de hoy frente a lo guardado, decidido una vez al abrir: si difiere (el aviso y «Total guardado») y los números de la tarjeta, que dibuja **lo guardado** (P5 a:
// valores y totales del snapshot, con los estados del primer recálculo); tipear después no los mueve.
function useLoDeHoy({ hoja, inicial }: PropsDeLaHoja) {
  const hayAviso = useMemo(
    () => difiereAlAbrir(hoja.guardado, inicial.respuesta),
    [hoja.guardado, inicial.respuesta],
  )
  const calculoDeLaTarjeta = useMemo(
    () => calculoDeLoGuardado(hoja, inicial.respuesta),
    [hoja, inicial.respuesta],
  )
  return {
    hayAviso,
    muestraElTotal: muestraElTotalGuardado(hoja.guardado, inicial.respuesta),
    calculoDeLaTarjeta,
  }
}

// El guardado de la guardada: lo guardado ya está en la base, así que los borradores (el de la hoja y el del título) se van, y el vehículo elegido sale de la URL sin ir al
// servidor: la versión nueva ya llegó con él (la revalidación de la action), así que la página lo trata como el suyo.
function useGuardadoConBorradores({
  personaId,
  cotizacionId,
  borrador,
}: {
  personaId: string
  cotizacionId: string
  borrador: string
}) {
  const titulo = useTituloDeLaCotizacion()
  const soltar = useSoltarElVehiculo()
  const guardado = useGuardadoDeUnaGuardada({
    personaId,
    cotizacionId,
    alGuardar: () => {
      guardarBorradorDeEstado(window.sessionStorage, borrador, {})
      titulo?.alGuardar()
      soltar({ shallow: true })
    },
  })
  return { guardado, soltar }
}

// Otra versión (el «Recargar» de un conflicto abre la de la otra persona): el aviso del último guardado hablaba de la de antes. Lo guardado por este mismo guardado no se olvida:
// «Cambios guardados.» se queda hasta el próximo cambio.
function useOlvidarConOtraVersion(
  actualizadoEn: string,
  guardado: { estado: { tipo: string }; olvidarAviso: () => void },
) {
  const [versionVista, setVersionVista] = useState(actualizadoEn)
  if (versionVista !== actualizadoEn) {
    setVersionVista(actualizadoEn)
    if (guardado.estado.tipo === 'aviso') {
      guardado.olvidarAviso()
    }
  }
}

// De dónde calcula y con qué abre la hoja: por SU cotización (nunca por un origen), con el vehículo elegido si lo hay, y con lo guardado como lo tipeado.
function useAperturaDeLaGuardada(hoja: HojaDeUnaGuardada, vehiculoNuevo: string | null) {
  return useMemo<AperturaDeHoja>(
    () => ({
      de: { tipo: 'guardada', cotizacionId: hoja.cotizacion.id, vehiculoId: vehiculoNuevo },
      iniciales: (indice) => entradasDeLoGuardado(indice, hoja.guardado, hoja.cotizacion),
      verTotalBsInicial: ofreceVerTotalBs(hoja.diseno.cabecera) && hoja.cotizacion.verTotalBs,
    }),
    [hoja, vehiculoNuevo],
  )
}

// Encima de la hoja: el aviso de la versión y la línea de la marca de privada del «⋯» (las dos esperan con cambios sin guardar).
function encimaDe(hoja: HojaDeUnaGuardada, personaId: string) {
  return function Encima(hayCambios: boolean) {
    return (
      <>
        <AvisoDeVersion hoja={hoja} hayCambios={hayCambios} />
        <PrivadaDelMenu hoja={hoja} personaId={personaId} hayCambios={hayCambios} />
      </>
    )
  }
}

// Si la página trajo otra lectura de la hoja (los datos del vehículo de la ayuda llegan con ella: no se comparan).
const otraLectura = (vistas: PropsDeLaHoja, props: PropsDeLaHoja) =>
  vistas.hoja !== props.hoja ||
  vistas.inicial !== props.inicial ||
  vistas.vehiculoNuevo !== props.vehiculoNuevo

// El marco de la hoja de una cotización guardada (`/cotizaciones/[id]`, 4.15-3). La hoja calcula por SU cotización (nunca por un origen) y abre con lo guardado como lo tipeado,
// así abrirla sin tocar nada no deja borrador. Quien no la puede guardar la lee en sólo lectura (P13). **Lo de hoy no siempre es lo guardado:** el recálculo usa las tablas de
// referencia y los datos del vehículo de hoy; si da otra cosa se dice y se muestra el total con que se guardó (C11, P2). Se decide una vez, al abrir: tipear después no lo cambia.
// **Otro vehículo** (T315, `vehiculoNuevo`): la hoja calcula con él, guardar lo manda y el aviso de C11 no se dice (sería falso); el «Total guardado», sí. Elegir otro vuelve a
// montar la hoja (`useRecalculo` lee su pedido una vez; el borrador repone lo tipeado) y «Recargar» lo suelta de la URL: nunca vuelve sobre otra versión.
// Lleva lo que tiene que sobrevivir a que la hoja se vuelva a montar con la versión nueva —el guardado con su pendiente y su «Cambios guardados.»— y, **mientras guarda,
// congela las props de la hoja** (como la nueva): una action que renueva la cookie de la sesión vuelve a dibujar la página, y la hoja no cambia a medio guardar. Su `key` es el
// id de la cotización; la de la hoja, su versión (`actualizadoEn`), la vuelta de «Descartar», la lectura que trajo «Recargar» y el vehículo elegido.
export function PantallaDeUnaGuardada({
  personaId,
  panelDelTitulo,
  cambiaVehiculo,
  ...props
}: Props) {
  const [vuelta, setVuelta] = useState(0)
  const [vistas, setVistas] = useState<PropsDeLaHoja>(props)
  // El guardado se arma con la versión que se vio, no con la que llegue a medio guardar: la clave del borrador es la de la hoja que se ve.
  const { hoja, inicial, vehiculoNuevo, valoresDelVehiculo } = vistas
  const borrador = claveDelBorradorDeUnaGuardada({
    personaId,
    cotizacionId: hoja.cotizacion.id,
    actualizadoEn: hoja.cotizacion.actualizadoEn,
  })
  const { guardado, soltar } = useGuardadoConBorradores({
    personaId,
    cotizacionId: hoja.cotizacion.id,
    borrador,
  })
  // «Recargar» sin que la versión se mueva: cuando la lectura llega, la hoja se vuelve a montar con ella. Si había un vehículo elegido, soltarlo ya pide la página.
  const lectura = useLecturaDeUnaGuardada(guardado.olvidarAviso, () => soltar({ shallow: false }))
  const congelada = guardado.estado.tipo === 'guardando'
  if (!congelada && otraLectura(vistas, props)) {
    setVistas(props)
    lectura.llego()
  }
  useOlvidarConOtraVersion(hoja.cotizacion.actualizadoEn, guardado)
  const diseno = useMemo(() => hojaSinAbierta(hoja.diseno), [hoja.diseno])
  const abre = useAperturaDeLaGuardada(hoja, vehiculoNuevo)
  const { hayAviso, muestraElTotal, calculoDeLaTarjeta } = useLoDeHoy(vistas)
  const vehiculoId = vehiculoNuevo ?? hoja.cotizacion.vehiculoId
  return (
    <HojaDeCotizar
      key={`${hoja.cotizacion.actualizadoEn}:${String(vuelta)}:${String(lectura.lecturas)}:${vehiculoNuevo ?? '-'}`}
      hoja={diseno}
      inicial={inicial}
      vehiculoId={vehiculoId}
      // Un vehículo elegido que no se pudo usar lo dice la barra de la cabecera (`src/app`), junto a «Elegir otro vehículo».
      vehiculoSoltado={false}
      valoresDelVehiculo={valoresDelVehiculo}
      leadId={hoja.cotizacion.leadId}
      guardado={null}
      abre={abre}
      alRecargar={lectura.recargar}
      encima={encimaDe(hoja, personaId)}
      soloLectura={!hoja.puedeGuardar}
      deLoGuardado={{ calculo: calculoDeLaTarjeta, difiere: hayAviso }}
      {...(hoja.puedeGuardar
        ? {
            edicion: {
              guardado,
              cotizacion: hoja.cotizacion,
              diferido: hayAviso,
              vehiculoId,
              cambiaVehiculo,
              panelDelTitulo,
            },
            borrador: {
              clave: borrador,
              alDescartar: () => {
                setVuelta((v) => v + 1)
              },
            },
          }
        : {})}
      totalGuardado={
        <TotalGuardado
          totalUsd={hoja.guardado.totalUsd}
          decimales={hoja.diseno.tarjetaTotal.decimales}
          // Con otro vehículo, «cambió una tabla o un dato del vehículo» no sería cierto: sólo el «Total guardado».
          hayAviso={hayAviso && vehiculoNuevo === null}
          muestraElTotal={muestraElTotal}
          puedeGuardar={hoja.puedeGuardar}
        />
      }
    />
  )
}
