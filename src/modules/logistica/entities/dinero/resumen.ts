// El resumen de la tarjeta «Dinero»: una línea por vista que quien mira ve —cuántos gastos, cuántos pagos y el margen que da la base (`margen_vehiculo`)— y, como aviso,
// los pagos sin confirmar. No suma montos: un total exacto pediría la lista entera (`docs/DECISIONES.md`); el margen es la cifra de la base, en moneda base. Sin I/O.
import { cantidadAcotada } from '@/shared/lib/conteo'
import { CLAVE_DE_PAGO, PAGO_NUEVO, PANEL_PAGO } from '../nucleo/paneles-de-la-unidad'
import {
  accionDeVer,
  type AccionDeLaTarjeta,
  type LineaDelResumen,
  type ResumenDeTarjeta,
} from '../nucleo/tarjeta'
import { SIN_VENTA_REGISTRADA } from './margen'
import { CLAVE_DE_GASTO, GASTO_NUEVO, PANEL_GASTO } from './paneles'

// Cuántos gastos y pagos mira el resumen: los mismos que dibuja cada hueco.
export const TOPE_DEL_RESUMEN_DE_DINERO = 50

export const ACCION_REGISTRAR_GASTO: AccionDeLaTarjeta = {
  clave: 'registrar-gasto',
  etiqueta: 'Registrar gasto',
  destino: { tipo: 'drawer', url: { panel: PANEL_GASTO, [CLAVE_DE_GASTO]: GASTO_NUEVO } },
}

export const ACCION_REGISTRAR_PAGO: AccionDeLaTarjeta = {
  clave: 'registrar-pago',
  etiqueta: 'Registrar pago',
  destino: { tipo: 'drawer', url: { panel: PANEL_PAGO, [CLAVE_DE_PAGO]: PAGO_NUEVO } },
}

export const SIN_GASTOS_TODAVIA = 'Sin gastos todavía'
export const SIN_PAGOS_TODAVIA = 'Sin pagos todavía'
export const MARGEN_SIN_VENTA = `Margen: ${SIN_VENTA_REGISTRADA.toLowerCase()}`

export type DineroDelResumen = {
  // Cuántos gastos se leyeron (hasta `tope + 1`); nulo si la vista «Gastos» no se ve.
  gastos: number | null
  // Si cada pago leído está confirmado (hasta `tope + 1`); nulo si la vista «Pagos» no se ve.
  pagos: readonly boolean[] | null
  // El margen de la base en moneda base (`valor` nulo sin venta registrada, nunca 0); nulo si la vista «Margen» no se ve.
  margen: { valor: number | null } | null
  puedeRegistrarGasto: boolean
  puedeRegistrarPago: boolean
}

const TOPE = TOPE_DEL_RESUMEN_DE_DINERO

function lineasDelDinero({ gastos, pagos, margen }: DineroDelResumen): LineaDelResumen[] {
  const lineas: LineaDelResumen[] = []
  if (gastos !== null) {
    lineas.push(
      gastos === 0
        ? SIN_GASTOS_TODAVIA
        : cantidadAcotada(gastos, TOPE, { singular: 'gasto', plural: 'gastos' }),
    )
  }
  if (pagos !== null) {
    lineas.push(
      pagos.length === 0
        ? SIN_PAGOS_TODAVIA
        : cantidadAcotada(pagos.length, TOPE, { singular: 'pago', plural: 'pagos' }),
    )
  }
  if (margen !== null) {
    lineas.push(
      margen.valor === null ? MARGEN_SIN_VENTA : { etiqueta: 'Margen', monto: margen.valor },
    )
  }
  return lineas
}

function avisoDelDinero(pagos: readonly boolean[] | null): string | null {
  const sinConfirmar = (pagos ?? []).slice(0, TOPE).filter((confirmado) => !confirmado).length
  if (sinConfirmar === 0) return null
  return sinConfirmar === 1 ? 'Pago sin confirmar' : `${String(sinConfirmar)} pagos sin confirmar`
}

export function resumenDeDinero(dinero: DineroDelResumen): ResumenDeTarjeta {
  return {
    lineas: lineasDelDinero(dinero),
    aviso: avisoDelDinero(dinero.pagos),
    acciones: [
      accionDeVer('dinero'),
      ...(dinero.gastos !== null && dinero.puedeRegistrarGasto ? [ACCION_REGISTRAR_GASTO] : []),
      ...(dinero.pagos !== null && dinero.puedeRegistrarPago ? [ACCION_REGISTRAR_PAGO] : []),
    ],
  }
}
