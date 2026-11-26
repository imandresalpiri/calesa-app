'use client'

import type { RefObject } from 'react'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { entradasDelPedido, entradasIguales, type Entradas } from '../../../entities/entradas'
import type { HojaLista } from '../../../entities/hoja'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import {
  loQueFalta,
  SIN_ELECCIONES,
  SIN_OBLIGATORIOS,
  type EleccionesDeLaHoja,
  type LoQueFalta,
  type ObligatoriosAlCotizar,
} from '../../../entities/obligatorios-al-cotizar'
import type { ArmadoDeCrearEnPar, ArmadoDeGuardarEnPar } from '../../../entities/pedido-en-par'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { motivoParaNoGuardar } from '../../../entities/se-puede-guardar'
import { tituloParaGuardar } from '../../../entities/titulo-de-la-cotizacion'
import type { BotonDeGuardar } from '../components/boton-guardar'
import { paraElegirElTitulo, tituloDeLaEdicion } from './titulo-de-la-edicion'
import { useAlGuardar } from './use-al-guardar'
import type { GuardadoDeUnPar } from './use-guardado-de-un-par'
import type { GuardadoEnPar } from './use-guardado-en-par'
import type { ColumnaDeLaHoja } from './use-hoja-en-par'
import type { AlDia } from './use-recalculo'
import { SIN_CAMBIOS } from './use-guardar-la-guardada'
import { useTituloDeLaCotizacion } from './use-titulo-de-la-cotizacion'

type DeDos<T> = readonly [T, T]

// Las dos hermanas abiertas juntas que quien mira puede guardar (glosario: «Cotizaciones hermanas»): su guardado, las dos cotizaciones en el orden de las opciones (la
// abierta con su título sin la opción), si lo de hoy no es lo guardado y el vehículo de la hoja.
export type EdicionDelPar = {
  guardado: GuardadoDeUnPar
  cotizaciones: DeDos<CotizacionDeLaHoja>
  abierta: 0 | 1
  diferido: boolean
  vehiculoId: string | null
  cambiaVehiculo: boolean
  panelDelTitulo?: string | undefined
}

const descarto = (respuesta: RespuestaDeRecalculo | null, entradas: Entradas) =>
  respuesta?.descartados.some((d) => entradas.overrides.has(d.id)) ?? false

// El primer motivo de las dos columnas para no guardar (la de la primera opción primero).
function motivoDelPar(
  columnas: DeDos<ColumnaDeLaHoja>,
  contextos: DeDos<ContextoDeHoja>,
  falta: LoQueFalta | null,
) {
  return (
    motivoParaNoGuardar({
      estado: columnas[0].estado,
      falta,
      total: totalDelResumen(contextos[0]),
      descartoLoTipeado: descarto(columnas[0].respuesta, columnas[0].entradas),
    }) ??
    motivoParaNoGuardar({
      estado: columnas[1].estado,
      falta,
      total: totalDelResumen(contextos[1]),
      descartoLoTipeado: descarto(columnas[1].respuesta, columnas[1].entradas),
    })
  )
}

// Las dos columnas al día (P8), una tras otra; con un fallo, nada.
function alDiaLasDos(
  columnas: DeDos<ColumnaDeLaHoja>,
  listo: (r: DeDos<Extract<AlDia, { ok: true }>> | null) => void,
) {
  columnas[0].alQuedarAlDia((ra) => {
    columnas[1].alQuedarAlDia((rb) => {
      listo(ra.ok && rb.ok ? [ra, rb] : null)
    })
  })
}

const sinMotivoAlDia = (columnas: DeDos<ColumnaDeLaHoja>, r: DeDos<Extract<AlDia, { ok: true }>>) =>
  r.every(
    (x, i) =>
      motivoParaNoGuardar({
        estado: { tipo: 'al_dia' },
        falta: null,
        total: totalDelResumen({
          indice: (columnas[i] as ColumnaDeLaHoja).indice,
          entradas: x.entradas,
          respuesta: x.respuesta,
        }),
        descartoLoTipeado: descarto(x.respuesta, x.entradas),
      }) === null,
  )

// «Guardar» de la hoja nueva en par: las dos columnas al día y un solo pedido con lo tipeado de cada una y lo común una vez.
function useGuardarLaNuevaEnPar(p: {
  columnas: DeDos<ColumnaDeLaHoja>
  contextos: DeDos<ContextoDeHoja>
  hoja: HojaLista
  leadId: string | null
  vehiculoId: string | null
  obligatorios: ObligatoriosAlCotizar | undefined
  elecciones: EleccionesDeLaHoja | undefined
  guardado: GuardadoEnPar | null
  raiz: RefObject<HTMLDivElement | null>
  // El interruptor «Privada» del marco: las dos hermanas nacen con la misma marca.
  privada?: boolean
}): BotonDeGuardar | null {
  const titulo = useTituloDeLaCotizacion()
  const elegido = titulo === null ? {} : { titulo: titulo.mostrado }
  const paraGuardar =
    titulo === null ? { titulo: null, tituloManual: false } : tituloParaGuardar(titulo.estado)
  const falta = loQueFalta(p.obligatorios ?? SIN_OBLIGATORIOS, {
    leadId: p.leadId,
    vehiculoId: p.vehiculoId,
    ...elegido,
  })
  const motivo = p.guardado?.hayPendiente ? null : motivoDelPar(p.columnas, p.contextos, falta)
  const armar = (listo: (armado: ArmadoDeCrearEnPar | null) => void) => {
    alDiaLasDos(p.columnas, (r) => {
      if (r === null || falta !== null || !sinMotivoAlDia(p.columnas, r)) {
        listo(null)
        return
      }
      listo({
        origenId: p.hoja.origen.id,
        leadId: p.leadId,
        vehiculoId: p.vehiculoId,
        abierta: p.columnas[0].abierta,
        entradas: [entradasDelPedido(r[0].entradas), entradasDelPedido(r[1].entradas)],
        modoTc: r[0].entradas.modoTc,
        verTotalBs: ofreceVerTotalBs(p.hoja.cabecera) && p.columnas[0].verTotalBs,
        ...paraGuardar,
        ...(p.privada === true ? { privada: true } : {}),
      })
    })
  }
  const alGuardar = useAlGuardar({ guardado: p.guardado, motivo, armar, raiz: p.raiz })
  if (p.guardado === null) return null
  return {
    motivo,
    motivoYaDicho: motivoYaDichoEn(p.contextos),
    ocupado: p.guardado.ocupado,
    alGuardar,
    paraElegir:
      motivo !== null && falta !== null
        ? { que: falta, eleccion: (p.elecciones ?? SIN_ELECCIONES)[falta] }
        : null,
  }
}

// Si nada cambió en las dos columnas (ni el título ni el vehículo).
const sinCambiosEnElPar = (
  columnas: DeDos<ColumnaDeLaHoja>,
  tituloCambio: boolean,
  cambiaVehiculo: boolean,
) =>
  columnas.every((c) => entradasIguales(c.entradas, c.iniciales)) &&
  columnas[0].verTotalBs === columnas[0].verTotalBsInicial &&
  !tituloCambio &&
  !cambiaVehiculo

const cambiaElVehiculo = (edicion: EdicionDelPar | null) =>
  edicion !== null && edicion.vehiculoId !== edicion.cotizaciones[0].vehiculoId

// Lo que se manda de las dos hermanas, con las dos columnas al día.
function armadoDelPar(
  edicion: EdicionDelPar,
  r: DeDos<Extract<AlDia, { ok: true }>>,
  comun: {
    verTotalBs: boolean
    titulo: { titulo: string | null; tituloManual: boolean }
    cambiaVehiculo: boolean
  },
): ArmadoDeGuardarEnPar {
  const [ca, cb] = edicion.cotizaciones
  return {
    ids: [ca.id, cb.id],
    actualizadosEn: [ca.actualizadoEn, cb.actualizadoEn],
    entradas: [entradasDelPedido(r[0].entradas), entradasDelPedido(r[1].entradas)],
    notas: [ca.notas, cb.notas],
    modoTc: r[0].entradas.modoTc,
    verTotalBs: comun.verTotalBs,
    ...comun.titulo,
    vehiculoId: edicion.vehiculoId,
    cambiaElVehiculo: comun.cambiaVehiculo,
  }
}

const motivoYaDichoEn = (contextos: DeDos<ContextoDeHoja>) =>
  contextos.some((c) => totalDelResumen(c).tipo === 'faltante')

// Lo que la edición dice, o lo de una hoja sin edición.
const deLaEdicion = (edicion: EdicionDelPar | null) => ({
  guardado: edicion?.guardado ?? null,
  abierta: edicion === null ? null : edicion.cotizaciones[edicion.abierta],
  vehiculoId: edicion?.vehiculoId ?? null,
  diferido: edicion?.diferido === true,
  cambiaVehiculo: cambiaElVehiculo(edicion),
})

// Con un pendiente, ninguno (se reenvía tal cual); si no, el de la hoja o «Sin cambios que guardar.».
function motivoDeLaEdicion(
  hayPendiente: boolean,
  generico: string | null,
  sinCambios: boolean,
  diferido: boolean,
) {
  if (hayPendiente) return null
  return generico ?? (sinCambios && !diferido ? SIN_CAMBIOS : null)
}

// «Guardar» de dos hermanas abiertas juntas: guardar cualquiera guarda las dos, cada una con su versión.
function useGuardarElParGuardado(p: {
  columnas: DeDos<ColumnaDeLaHoja>
  contextos: DeDos<ContextoDeHoja>
  edicion: EdicionDelPar | null
  raiz: RefObject<HTMLDivElement | null>
}) {
  const { edicion, columnas } = p
  const e = deLaEdicion(edicion)
  const titulo = tituloDeLaEdicion(useTituloDeLaCotizacion(), e.abierta, e.vehiculoId)
  const sinCambios = sinCambiosEnElPar(columnas, titulo.cambio, e.cambiaVehiculo)
  const motivo = motivoDeLaEdicion(
    e.guardado?.hayPendiente === true,
    motivoDelPar(columnas, p.contextos, titulo.falta),
    sinCambios,
    e.diferido,
  )
  const armar = (listo: (armado: ArmadoDeGuardarEnPar | null) => void) => {
    alDiaLasDos(columnas, (r) => {
      const ok = r !== null && edicion !== null && sinMotivoAlDia(columnas, r)
      listo(
        ok
          ? armadoDelPar(edicion, r, {
              verTotalBs: columnas[0].verTotalBs,
              titulo: titulo.paraGuardar,
              cambiaVehiculo: e.cambiaVehiculo,
            })
          : null,
      )
    })
  }
  const alGuardar = useAlGuardar({ guardado: e.guardado, motivo, armar, raiz: p.raiz })
  const boton: BotonDeGuardar | null =
    e.guardado === null
      ? null
      : {
          motivo,
          motivoYaDicho: motivoYaDichoEn(p.contextos),
          ocupado: e.guardado.ocupado,
          alGuardar,
          paraElegir: paraElegirElTitulo(motivo, titulo.falta, edicion),
        }
  return { boton, hayCambios: e.guardado !== null && (!sinCambios || e.guardado.hayPendiente) }
}

// «Guardar» de la hoja en par: el de la nueva o el de dos hermanas guardadas (sólo uno trae su guardado).
export function useGuardarElPar(p: {
  columnas: DeDos<ColumnaDeLaHoja>
  contextos: DeDos<ContextoDeHoja>
  hoja: HojaLista
  leadId: string | null
  vehiculoId: string | null
  obligatorios: ObligatoriosAlCotizar | undefined
  elecciones: EleccionesDeLaHoja | undefined
  guardado: GuardadoEnPar | null
  edicion: EdicionDelPar | null
  raiz: RefObject<HTMLDivElement | null>
  privada?: boolean
}) {
  const deLaNueva = useGuardarLaNuevaEnPar(p)
  const deLaGuardada = useGuardarElParGuardado(p)
  return { boton: deLaNueva ?? deLaGuardada.boton, hayCambios: deLaGuardada.hayCambios }
}
