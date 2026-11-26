'use client'

import { useMemo, useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../../entities/apertura'
import { calculoDeLoGuardado } from '../../../../entities/calculo-de-la-tarjeta'
import { ofreceVerTotalBs } from '../../../../entities/cabecera-de-la-hoja'
import { claveDelBorradorDeUnaGuardada, claveEnPar } from '../../../../entities/claves-de-la-hoja'
import { indiceDeHoja, type IndiceDeHoja } from '../../../../entities/entradas'
import { entradasDeLoGuardado } from '../../../../entities/entradas-de-lo-guardado'
import {
  AVISO_DE_LO_COMUN_DISTINTO,
  comunesIguales,
  conLoComunDe,
  nodosEnParDeLaHoja,
} from '../../../../entities/entradas-en-par'
import {
  difiereAlAbrir,
  hojaSinAbierta,
  muestraElTotalGuardado,
  type HojaDeUnaGuardada,
} from '../../../../entities/hoja-de-una-guardada'
import { otroLado, type LadoDelPar, type ParDeHoja } from '../../../../entities/hoja-en-par'
import { tituloBaseDeLaHermana } from '../../../../entities/titulo-en-par'
import { AvisoDeVersion } from '../../../encima/components/aviso-de-version'
import { PrivadaDelMenu } from '../../../privada/components/privada-del-menu'
import { useGuardadoDeUnPar } from '../../hooks/use-guardado-de-un-par'
import type { AperturaDeHoja } from '../../hooks/use-hoja'
import { useLecturaDeUnaGuardada } from '../../hooks/use-lectura-de-una-guardada'
import { useTituloDeLaCotizacion } from '../../hooks/use-titulo-de-la-cotizacion'
import { useSoltarElVehiculo } from '../../hooks/use-vehiculo-en-la-url'
import { TotalGuardado } from '../total-guardado'
import { HojaEnPar } from './hoja-en-par'

type DeDos<T> = readonly [T, T]
type PropsDeLaHoja = {
  hojas: DeDos<HojaDeUnaGuardada>
  iniciales: DeDos<RecalculoInicial>
  vehiculoNuevo: string | null
}
type Props = PropsDeLaHoja & {
  // La que se abrió (la otra es su hermana), en el orden de las opciones.
  abierta: LadoDelPar
  par: ParDeHoja
  personaId: string
  cambiaVehiculo: boolean
  panelDelTitulo?: string
}

// Las entradas de cada columna: las suyas guardadas y, en la que no se abrió, lo común de la que se abrió (manda lo de esta; al guardar queda en las dos).
function useAperturas(p: PropsDeLaHoja & { abierta: LadoDelPar }) {
  const { hojas, vehiculoNuevo, abierta } = p
  return useMemo(() => {
    const enPar = nodosEnParDeLaHoja(hojas[abierta].diseno.secciones)
    const propias = (i: LadoDelPar) => (indice: IndiceDeHoja) =>
      entradasDeLoGuardado(indice, hojas[i].guardado, hojas[i].cotizacion)
    const apertura = (i: LadoDelPar): AperturaDeHoja => ({
      de: { tipo: 'guardada', cotizacionId: hojas[i].cotizacion.id, vehiculoId: vehiculoNuevo },
      iniciales:
        i === abierta
          ? propias(i)
          : (indice) => conLoComunDe(propias(i)(indice), propias(abierta)(indice), enPar),
      verTotalBsInicial:
        ofreceVerTotalBs(hojas[abierta].diseno.cabecera) && hojas[abierta].cotizacion.verTotalBs,
    })
    const distintos = (indice: IndiceDeHoja) =>
      !comunesIguales(propias(0)(indice), propias(1)(indice), enPar)
    return { aperturas: [apertura(0), apertura(1)] as const, distintos }
  }, [hojas, vehiculoNuevo, abierta])
}

function useGuardadoDelPar(p: {
  personaId: string
  hojas: DeDos<HojaDeUnaGuardada>
  abierta: LadoDelPar
  par: ParDeHoja
  borrador: string
}) {
  const titulo = useTituloDeLaCotizacion()
  const soltar = useSoltarElVehiculo()
  const guardado = useGuardadoDeUnPar({
    personaId: p.personaId,
    cotizacionId: p.hojas[p.abierta].cotizacion.id,
    etiquetas: [p.par.opciones[0].etiqueta, p.par.opciones[1].etiqueta],
    alGuardar: () => {
      guardarBorradorDeEstado(window.sessionStorage, p.borrador, {})
      titulo?.alGuardar()
      soltar({ shallow: true })
    },
  })
  return { guardado, soltar }
}

// Lo de hoy contra lo guardado de la que se abrió: si difiere, lo guardado para la tarjeta y si lo común de las dos era distinto.
function useLoDeHoy(p: {
  hojas: DeDos<HojaDeUnaGuardada>
  iniciales: DeDos<RecalculoInicial>
  abierta: LadoDelPar
  distintos: (i: IndiceDeHoja) => boolean
}) {
  const { hojas, iniciales, abierta, distintos } = p
  const laAbierta = hojas[abierta]
  const diseno = useMemo(() => hojaSinAbierta(laAbierta.diseno), [laAbierta.diseno])
  const comunesDistintos = useMemo(
    () =>
      distintos(
        indiceDeHoja(diseno.secciones, diseno.cabecera.modos, diseno.cabecera.modoPorDefecto),
      ),
    [distintos, diseno],
  )
  const hayAviso = useMemo(
    () => difiereAlAbrir(laAbierta.guardado, iniciales[abierta].respuesta),
    [laAbierta, iniciales, abierta],
  )
  const calculo = useMemo(
    () => calculoDeLoGuardado(laAbierta, iniciales[abierta].respuesta),
    [laAbierta, iniciales, abierta],
  )
  const laOtra = hojas[otroLado(abierta)]
  const inicialDeLaOtra = iniciales[otroLado(abierta)]
  const deLaHermana = useMemo(
    () => ({
      calculo: calculoDeLoGuardado(laOtra, inicialDeLaOtra.respuesta),
      pagina: {
        titulo: laOtra.cotizacion.titulo,
        numero: laOtra.cotizacion.numero,
        guardadaEl: laOtra.cotizacion.actualizadoEn,
        retoques: laOtra.cotizacion.tarjetaRetoques,
      },
    }),
    [laOtra, inicialDeLaOtra],
  )
  return { diseno, comunesDistintos, hayAviso, calculo, deLaHermana }
}

// Lo que va sobre la hoja: el aviso de versión de la que se abrió y, si lo común era distinto, que se muestra el de esta.
function Encima({
  hoja,
  hayCambios,
  comunesDistintos,
  personaId,
}: {
  hoja: HojaDeUnaGuardada
  hayCambios: boolean
  comunesDistintos: boolean
  personaId: string
}) {
  return (
    <>
      <AvisoDeVersion hoja={hoja} hayCambios={hayCambios} />
      <PrivadaDelMenu hoja={hoja} personaId={personaId} hayCambios={hayCambios} />
      {comunesDistintos ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {AVISO_DE_LO_COMUN_DISTINTO}
        </p>
      ) : null}
    </>
  )
}

// Las dos cotizaciones para guardar, con el título sin su opción (lo que se edita).
const conTituloBase = (hojas: DeDos<HojaDeUnaGuardada>, par: ParDeHoja) =>
  [0, 1].map((i) => ({
    ...hojas[i === 0 ? 0 : 1].cotizacion,
    titulo: tituloBaseDeLaHermana(
      hojas[i === 0 ? 0 : 1].cotizacion.titulo,
      par.opciones[i === 0 ? 0 : 1].etiqueta,
    ),
  })) as unknown as DeDos<HojaDeUnaGuardada['cotizacion']>

// «Total guardado» de la que se abrió, cuando lo de hoy no es lo guardado.
function totalGuardadoDe(
  hoja: HojaDeUnaGuardada,
  inicial: RecalculoInicial,
  p: { hayAviso: boolean; puedeGuardar: boolean },
) {
  return (
    <TotalGuardado
      totalUsd={hoja.guardado.totalUsd}
      decimales={hoja.diseno.tarjetaTotal.decimales}
      hayAviso={p.hayAviso}
      muestraElTotal={muestraElTotalGuardado(hoja.guardado, inicial.respuesta)}
      puedeGuardar={p.puedeGuardar}
    />
  )
}

// Las props congeladas mientras guarda; al llegar otras, la lectura lo sabe («Recargar»).
function useVistas(props: PropsDeLaHoja, congelada: boolean, llego: () => void) {
  const [vistas, setVistas] = useState<PropsDeLaHoja>(props)
  const cambiaron =
    vistas.hojas !== props.hojas ||
    vistas.iniciales !== props.iniciales ||
    vistas.vehiculoNuevo !== props.vehiculoNuevo
  if (!congelada && cambiaron) {
    setVistas(props)
    llego()
  }
  return vistas
}

// Las dos hermanas abiertas juntas (glosario: «Cotizaciones hermanas»): la hoja en par, cada columna con SU cotización (la misma versión) y guardar cualquiera guarda
// las dos (`cotizacion_guardar_en_par`). Como la de una guardada: congela lo que muestra mientras guarda y «Recargar» la vuelve a montar.
export function PantallaDeUnParGuardado({
  abierta,
  par,
  personaId,
  cambiaVehiculo,
  panelDelTitulo,
  ...props
}: Props) {
  const [vuelta, setVuelta] = useState(0)
  const abiertaAhora = props.hojas[abierta]
  const borrador = claveEnPar(
    claveDelBorradorDeUnaGuardada({
      personaId,
      cotizacionId: abiertaAhora.cotizacion.id,
      actualizadoEn: abiertaAhora.cotizacion.actualizadoEn,
    }),
  )
  const { guardado, soltar } = useGuardadoDelPar({
    personaId,
    hojas: props.hojas,
    abierta,
    par,
    borrador,
  })
  const lectura = useLecturaDeUnaGuardada(guardado.olvidarAviso, () => soltar({ shallow: false }))
  const { hojas, iniciales, vehiculoNuevo } = useVistas(
    props,
    guardado.estado.tipo === 'guardando',
    lectura.llego,
  )
  const laAbierta = hojas[abierta]
  const { aperturas, distintos } = useAperturas({ hojas, iniciales, vehiculoNuevo, abierta })
  const { diseno, comunesDistintos, hayAviso, calculo, deLaHermana } = useLoDeHoy({
    hojas,
    iniciales,
    abierta,
    distintos,
  })
  const vehiculoId = vehiculoNuevo ?? laAbierta.cotizacion.vehiculoId
  const puedeGuardar = laAbierta.puedeGuardar && hojas[otroLado(abierta)].puedeGuardar
  const deEncima = { hoja: laAbierta, comunesDistintos, personaId }
  const edicion = {
    guardado,
    cotizaciones: conTituloBase(hojas, par),
    abierta,
    diferido: hayAviso,
    vehiculoId,
    cambiaVehiculo,
    panelDelTitulo,
  }
  return (
    <HojaEnPar
      key={`${hojas[0].cotizacion.actualizadoEn}:${hojas[1].cotizacion.actualizadoEn}:${String(vuelta)}:${String(lectura.lecturas)}:${vehiculoNuevo ?? '-'}`}
      hoja={diseno}
      par={par}
      iniciales={iniciales}
      aperturas={aperturas}
      vehiculoId={vehiculoId}
      vehiculoSoltado={false}
      leadId={laAbierta.cotizacion.leadId}
      guardado={null}
      alRecargar={lectura.recargar}
      soloLectura={!puedeGuardar}
      deLoGuardado={{ calculo, difiere: hayAviso }}
      deLaHermana={deLaHermana}
      abierta={abierta}
      encima={(hayCambios) => <Encima {...deEncima} hayCambios={hayCambios} />}
      {...(puedeGuardar
        ? { edicion, borrador: { clave: borrador, alDescartar: () => setVuelta((v) => v + 1) } }
        : {})}
      totalGuardado={totalGuardadoDe(laAbierta, iniciales[abierta], {
        hayAviso: hayAviso && vehiculoNuevo === null,
        puedeGuardar,
      })}
    />
  )
}
