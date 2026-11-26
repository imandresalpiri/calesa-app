'use client'

import type { RefObject } from 'react'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import { entradasDelPedido, type Entradas } from '../../../entities/entradas'
import type { HojaLista } from '../../../entities/hoja'
import {
  loQueFalta,
  SIN_ELECCIONES,
  SIN_OBLIGATORIOS,
  type EleccionesDeLaHoja,
  type ObligatoriosAlCotizar,
} from '../../../entities/obligatorios-al-cotizar'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { motivoParaNoGuardar } from '../../../entities/se-puede-guardar'
import { tituloParaGuardar } from '../../../entities/titulo-de-la-cotizacion'
import type { BotonDeGuardar } from '../components/boton-guardar'
import { useAlGuardar } from './use-al-guardar'
import type { Armar, Guardado } from './use-nucleo-del-guardado'
import type { useHoja } from './use-hoja'
import { useTituloDeLaCotizacion, type TituloDeLaCotizacion } from './use-titulo-de-la-cotizacion'

// Un override que la persona mandó y el recálculo descartó: la base lo rechaza al guardar (P9).
const descartoLoTipeado = (respuesta: RespuestaDeRecalculo | null, entradas: Entradas) =>
  respuesta?.descartados.some((d) => entradas.overrides.has(d.id)) ?? false

// El título en la hoja nueva (T307), del proveedor que `src/app` pone sobre la hoja: el que se ve (para lo que falta) y lo que va en el pedido. Sin él (una prueba), ni se
// pide ni se manda.
const delTitulo = (titulo: TituloDeLaCotizacion | null) =>
  titulo === null
    ? { elegido: {}, paraGuardar: { titulo: null, tituloManual: false } }
    : { elegido: { titulo: titulo.mostrado }, paraGuardar: tituloParaGuardar(titulo.estado) }

// Lo que la hoja pone para guardar: el motivo para no hacerlo (con un pendiente no hay: se reenvía tal cual, 4-21), cómo arma el pedido con el total al día (P8: las
// entradas que ese recálculo calculó, la misma hoja abierta, y las guardas otra vez con su respuesta) y qué hace «Guardar»: confirmar la celda abierta y pedir.
export function useGuardarLaHoja({
  h,
  contexto,
  hoja,
  leadId,
  vehiculoId,
  obligatorios,
  elecciones,
  guardado,
  raiz,
  privada = false,
}: {
  h: ReturnType<typeof useHoja>
  contexto: ContextoDeHoja
  hoja: HojaLista
  leadId: string | null
  vehiculoId: string | null
  // Lo que el rol pide elegir en este origen (la página lo calcula con los permisos: `obligatoriosAlCotizar()`) y cómo se elige.
  obligatorios: ObligatoriosAlCotizar | undefined
  elecciones: EleccionesDeLaHoja | undefined
  // Nulo: la hoja no guarda (una guardada de sólo lectura, o todavía sin «Guardar»): ni botón ni `Ctrl/Cmd+S`.
  guardado: Guardado | null
  raiz: RefObject<HTMLDivElement | null>
  // El interruptor «Privada» (`usePrivadaDeLaNueva()`, del marco): va en el pedido sólo encendido.
  privada?: boolean
}) {
  const titulo = delTitulo(useTituloDeLaCotizacion())
  // Sin ellos (una guardada, o una hoja que no los trae) la hoja no pide nada; sin vehículo, el título sí.
  const falta = loQueFalta(obligatorios ?? SIN_OBLIGATORIOS, {
    leadId,
    vehiculoId,
    ...titulo.elegido,
  })
  // Un pendiente se reenvía tal cual: las guardas de la hoja no le aplican (4-21).
  const motivo = guardado?.hayPendiente
    ? null
    : motivoParaNoGuardar({
        estado: h.estado,
        falta,
        total: totalDelResumen(contexto),
        descartoLoTipeado: descartoLoTipeado(h.respuesta, h.entradas),
      })
  const armar: Armar = (listo) => {
    h.alQuedarAlDia((r) => {
      if (!r.ok || falta !== null) {
        listo(null)
        return
      }
      const motivoAlDia = motivoParaNoGuardar({
        estado: { tipo: 'al_dia' },
        falta,
        total: totalDelResumen({ indice: h.indice, entradas: r.entradas, respuesta: r.respuesta }),
        descartoLoTipeado: descartoLoTipeado(r.respuesta, r.entradas),
      })
      listo(
        motivoAlDia === null
          ? {
              origenId: hoja.origen.id,
              leadId,
              vehiculoId,
              abierta: h.abierta,
              entradas: entradasDelPedido(r.entradas),
              modoTc: r.entradas.modoTc,
              verTotalBs: ofreceVerTotalBs(hoja.cabecera) && h.verTotalBs,
              ...titulo.paraGuardar,
              ...(privada ? { privada: true } : {}),
            }
          : null,
      )
    })
  }
  const alGuardar = useAlGuardar({ guardado, motivo, armar, raiz })
  const boton =
    guardado === null ? null : botonDe({ guardado, motivo, falta, elecciones, alGuardar, contexto })
  return { boton }
}

// «Guardar» con su motivo y, si falta algo que se elige, cómo elegirlo.
function botonDe(p: {
  guardado: Guardado
  motivo: string | null
  falta: ReturnType<typeof loQueFalta>
  elecciones: EleccionesDeLaHoja | undefined
  alGuardar: () => void
  contexto: ContextoDeHoja
}): BotonDeGuardar {
  return {
    motivo: p.motivo,
    motivoYaDicho: totalDelResumen(p.contexto).tipo === 'faltante',
    ocupado: p.guardado.ocupado,
    alGuardar: p.alGuardar,
    // Con un pendiente no hay motivo (se reenvía tal cual): nada que elegir.
    paraElegir:
      p.motivo !== null && p.falta !== null
        ? { que: p.falta, eleccion: (p.elecciones ?? SIN_ELECCIONES)[p.falta] }
        : null,
  }
}
