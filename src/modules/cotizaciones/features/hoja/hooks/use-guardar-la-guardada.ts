'use client'

import type { RefObject } from 'react'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import { entradasDelPedido, entradasIguales } from '../../../entities/entradas'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import type { ArmadoDeEdicion } from '../../../entities/pedido-de-edicion'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { motivoParaNoGuardar } from '../../../entities/se-puede-guardar'
import type { BotonDeGuardar } from '../components/boton-guardar'
import { useAlGuardar } from './use-al-guardar'
import { paraElegirElTitulo, tituloDeLaEdicion } from './titulo-de-la-edicion'
import type { GuardadoDeUnaGuardada } from './use-guardado-de-una-guardada'
import type { ArmarDe } from './use-nucleo-del-guardado'
import type { useHoja } from './use-hoja'
import { useTituloDeLaCotizacion, type TituloDeLaCotizacion } from './use-titulo-de-la-cotizacion'

export const SIN_CAMBIOS = 'Sin cambios que guardar.'

// Lo que la hoja necesita de la cotización guardada que edita: su guardado (en el marco), la fila de la versión con que se abrió, si lo de hoy no es lo guardado (C11) y el
// vehículo de la hoja (el guardado, o el elegido en una preventa para cambiarlo: T315), con si quien mira puede cambiarlo.
export type EdicionDeLaHoja = {
  guardado: GuardadoDeUnaGuardada
  cotizacion: CotizacionDeLaHoja
  diferido: boolean
  vehiculoId: string | null
  // Quien mira puede elegir otro vehículo (una preventa que guarda): el rechazo de uno que ya no se usa ofrece «Elegir otro vehículo».
  cambiaVehiculo: boolean
  // El panel donde se escribe el título (`?panel=vehiculo`; el nombre lo pasa `src/app`): «Escribir el título» lo abre. Sin él, sólo se dice qué falta.
  panelDelTitulo?: string | undefined
}

// Lo tipeado y sin guardar, o un guardado pendiente; sin guardado (la nueva, o quien sólo ve) no hay cambios que esperar.
const tieneCambios = (guardado: GuardadoDeUnaGuardada | null, sinCambios: boolean) =>
  guardado !== null && (!sinCambios || guardado.hayPendiente)

const descartoLoTipeado = (
  respuesta: RespuestaDeRecalculo | null,
  overrides: ReadonlyMap<string, number>,
) => respuesta?.descartados.some((d) => overrides.has(d.id)) ?? false

// Lo tipeado, «Ver total Bs», el título y el vehículo son lo que se abrió.
const sinCambiosEn = (
  h: ReturnType<typeof useHoja>,
  tituloCambio: boolean,
  vehiculoCambio: boolean,
) =>
  entradasIguales(h.entradas, h.iniciales) &&
  h.verTotalBs === h.verTotalBsInicial &&
  !tituloCambio &&
  !vehiculoCambio

// El título de la guardada que edita, con el vehículo de la hoja; sin edición, nada que pedir.
const tituloDe = (titulo: TituloDeLaCotizacion | null, edicion: EdicionDeLaHoja | null) =>
  tituloDeLaEdicion(titulo, edicion?.cotizacion ?? null, edicion?.vehiculoId ?? null)

// La hoja calcula con otro vehículo que el guardado (T315): es un cambio que guardar.
const cambiaElVehiculo = (edicion: EdicionDeLaHoja | null) =>
  edicion !== null && edicion.vehiculoId !== edicion.cotizacion.vehiculoId

// Lo que la hoja de una cotización guardada pone para guardar (4.15-3, C8): el motivo para no hacerlo y cómo arma el pedido con el total al día (las entradas que ese recálculo
// calculó, P8). Guardar no pide cliente ni vehículo: el cliente no se toca y el vehículo es el de la hoja (el guardado o el elegido, T315); sin vehículo pide el título (T307),
// que se escribe en el panel del vehículo. **Sin cambios no hay nada que guardar** (cambiar el título o el vehículo es un cambio), salvo dos casos en que «Guardar» está
// encendido: hay un pendiente (se reenvía tal cual, 4-21) o
// lo de hoy no es lo guardado (`diferido`, C11: guardar lo deja con lo de hoy).
export function useGuardarLaGuardada({
  h,
  contexto,
  edicion,
  raiz,
}: {
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  // Nulo: la hoja no edita una guardada (la nueva) o quien mira sólo la ve: ni botón ni `Ctrl/Cmd+S`.
  edicion: EdicionDeLaHoja | null
  raiz: RefObject<HTMLDivElement | null>
}) {
  const guardado = edicion?.guardado ?? null
  const titulo = tituloDe(useTituloDeLaCotizacion(), edicion)
  const total = totalDelResumen(contexto)
  const cambiaVehiculo = cambiaElVehiculo(edicion)
  const sinCambios = sinCambiosEn(h, titulo.cambio, cambiaVehiculo)
  const generico = motivoParaNoGuardar({
    estado: h.estado,
    falta: titulo.falta,
    total,
    descartoLoTipeado: descartoLoTipeado(h.respuesta, h.entradas.overrides),
  })
  const motivo = guardado?.hayPendiente
    ? null
    : (generico ?? (sinCambios && edicion?.diferido !== true ? SIN_CAMBIOS : null))
  const armar: ArmarDe<ArmadoDeEdicion> = (listo) => {
    h.alQuedarAlDia((r) => {
      if (!r.ok || edicion === null) {
        listo(null)
        return
      }
      const alDia = motivoParaNoGuardar({
        estado: { tipo: 'al_dia' },
        falta: null,
        total: totalDelResumen({ indice: h.indice, entradas: r.entradas, respuesta: r.respuesta }),
        descartoLoTipeado: descartoLoTipeado(r.respuesta, r.entradas.overrides),
      })
      listo(
        alDia === null
          ? {
              cotizacionId: edicion.cotizacion.id,
              actualizadoEn: edicion.cotizacion.actualizadoEn,
              entradas: entradasDelPedido(r.entradas),
              modoTc: r.entradas.modoTc,
              verTotalBs: h.verTotalBs,
              ...titulo.paraGuardar,
              notas: edicion.cotizacion.notas,
              vehiculoId: edicion.vehiculoId,
              cambiaElVehiculo: cambiaVehiculo,
            }
          : null,
      )
    })
  }
  const alGuardar = useAlGuardar({ guardado, motivo, armar, raiz })
  // «Cotizar encima» espera a que no haya cambios, porque la versión nueva lleva lo guardado (4.15-3b, P1 a).
  const hayCambios = tieneCambios(guardado, sinCambios)
  const boton: BotonDeGuardar | null =
    guardado === null
      ? null
      : {
          motivo,
          motivoYaDicho: total.tipo === 'faltante',
          ocupado: guardado.ocupado,
          alGuardar,
          paraElegir: paraElegirElTitulo(motivo, titulo.falta, edicion),
        }
  return { boton, hayCambios }
}
