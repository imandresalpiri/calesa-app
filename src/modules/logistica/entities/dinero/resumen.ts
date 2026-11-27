// El resumen de la tarjeta «Dinero» (gastos, pagos y margen): cuántos gastos y pagos tiene —sólo de los huecos que quien mira ve— y, como aviso, los pagos sin
// confirmar. No suma montos: un total exacto pediría la lista entera (D34 del plan; `docs/DECISIONES.md`). El margen no se lee para el resumen. Sin I/O.
import { cantidadAcotada } from '@/shared/lib/conteo'
import { CLAVE_DE_PAGO, PAGO_NUEVO, PANEL_PAGO } from '../nucleo/paneles-de-la-unidad'
import { accionDeVer, type AccionDeLaTarjeta, type ResumenDeTarjeta } from '../nucleo/tarjeta'
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

export type DineroDelResumen = {
  // Cuántos gastos se leyeron (hasta `tope + 1`); nulo si el hueco «Gastos» no se ve.
  gastos: number | null
  // Si cada pago leído está confirmado (hasta `tope + 1`); nulo si el hueco «Pagos» no se ve.
  pagos: readonly boolean[] | null
  puedeRegistrarGasto: boolean
  puedeRegistrarPago: boolean
}

const TOPE = TOPE_DEL_RESUMEN_DE_DINERO

function lineasDelDinero({ gastos, pagos }: DineroDelResumen): string[] {
  if (gastos === null && pagos === null) return ['El margen contra la cotización final.']
  if ((gastos ?? 0) === 0 && (pagos?.length ?? 0) === 0) return ['Sin gastos ni pagos todavía.']
  const partes = [
    gastos === null ? null : cantidadAcotada(gastos, TOPE, { singular: 'gasto', plural: 'gastos' }),
    pagos === null
      ? null
      : cantidadAcotada(pagos.length, TOPE, { singular: 'pago', plural: 'pagos' }),
  ]
  return [partes.filter((p) => p !== null).join(' · ')]
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
