// Los avisos de las tarjetas que salen de «Qué falta» («Falta «BL»» en Documentos, «Falta «Anticipo»» en Dinero): se calculan en el navegador sobre la última lectura
// de «Qué falta», así siguen al día al releerla sin otra consulta. Miran los requisitos bloqueantes sin cumplir del destino principal (la siguiente fase del camino si
// es un destino; si no, el primero) y los reparten por la tarjeta donde se destraban (el hueco de su acción: gastos, pagos y margen van a Dinero). Sin I/O.
import { tarjetaDelHueco, type ClaveDeTarjeta } from '../nucleo/tarjetas'
import type { AccionesDelRequisito, RequisitoQueFalta } from './accion-de-requisito'

type Destino = {
  faseId: string
  requisitos: readonly Pick<
    RequisitoQueFalta,
    'requisitoId' | 'cumplido' | 'bloqueante' | 'etiqueta'
  >[]
}

/** El destino cuyos requisitos avisan: la siguiente fase del camino si es una salida; si no, el primero; nulo sin destinos. */
export function destinoPrincipal<D extends Destino>(
  destinos: readonly D[],
  siguiente: string | null,
): D | null {
  return destinos.find((d) => d.faseId === siguiente) ?? destinos[0] ?? null
}

const QUE_FALTA: Record<ClaveDeTarjeta, string> = {
  documentos: 'documentos',
  dinero: 'pagos',
  transporte: 'datos',
  aduana: 'datos',
  repuestos: 'repuestos',
  notas: 'requisitos',
  historial: 'requisitos',
}

/** Por tarjeta, el aviso: «Falta «BL»» con una sola falta; «Faltan 2 documentos» con más. Sin faltas, nada. */
export function avisosDeQueFalta(
  destino: Destino | null,
  acciones: Readonly<Record<string, AccionesDelRequisito>>,
): Partial<Record<ClaveDeTarjeta, string>> {
  if (destino === null) return {}
  const porTarjeta = new Map<ClaveDeTarjeta, string[]>()
  for (const r of destino.requisitos) {
    if (r.cumplido || !r.bloqueante) continue
    const tarjeta = tarjetaDelHueco(acciones[r.requisitoId]?.hueco)
    if (tarjeta === null) continue
    porTarjeta.set(tarjeta, [...(porTarjeta.get(tarjeta) ?? []), r.etiqueta])
  }
  const avisos: Partial<Record<ClaveDeTarjeta, string>> = {}
  for (const [tarjeta, faltan] of porTarjeta) {
    avisos[tarjeta] =
      faltan.length === 1
        ? `Falta «${faltan[0] ?? ''}»`
        : `Faltan ${String(faltan.length)} ${QUE_FALTA[tarjeta]}`
  }
  return avisos
}
