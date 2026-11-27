// El resumen de la tarjeta «Documentos» (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): cuántos hay y cuántos aprobados, y un aviso propio —«N por aprobar», si no
// «Vencido», si no «Vence en N días» del aprobado más próximo a vencer dentro de su `aviso_dias`—. «Falta «BL»» no sale de aquí: lo da «Qué falta». Sin I/O.
import { z } from 'zod'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { CLAVE_DE_SUBIR } from '../nucleo/paneles-de-la-unidad'
import { accionDeVer, type AccionDeLaTarjeta, type ResumenDeTarjeta } from '../nucleo/tarjeta'
import { ESTADOS_DE_DOCUMENTO, type EstadoDeDocumento } from './documento'
import { estaVencido } from './vencimiento'

// Cuántos documentos mira el resumen: los mismos que dibuja el hueco (`TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD`).
export const TOPE_DEL_RESUMEN_DE_DOCUMENTOS = 50

export const COLUMNAS_DEL_RESUMEN_DE_DOCUMENTOS =
  'estado, vence_el, tipo:tipos_documento!documentos_tipo_documento_id_fkey(aviso_dias, modo_vencimiento)'

export type DocumentoDelResumen = {
  estado: EstadoDeDocumento
  venceEl: string | null
  // Días antes de vencer en que avisa; nulo = no avisa antes.
  avisoDias: number | null
  // Un tipo sin vencimiento (`ninguno`) nunca avisa.
  vence: boolean
}

const esquema = z.array(
  z.object({
    estado: z.enum(ESTADOS_DE_DOCUMENTO),
    vence_el: z.string().nullable(),
    tipo: z
      .object({
        aviso_dias: z.number().int().nullable(),
        modo_vencimiento: z.enum(['ninguno', 'renovar', 'solicitar']),
      })
      .nullable(),
  }),
)

/** Lo que devolvió la consulta del resumen; nulo si no tiene la forma esperada. */
export function documentosDelResumenDesde(crudo: unknown): DocumentoDelResumen[] | null {
  const leido = esquema.safeParse(crudo)
  if (!leido.success) return null
  return leido.data.map((d) => ({
    estado: d.estado,
    venceEl: d.vence_el,
    avisoDias: d.tipo?.aviso_dias ?? null,
    vence: d.tipo !== null && d.tipo.modo_vencimiento !== 'ninguno',
  }))
}

export const ACCION_SUBIR_DOCUMENTOS: AccionDeLaTarjeta = {
  clave: 'subir',
  etiqueta: 'Subir documentos',
  destino: { tipo: 'drawer', url: { [CLAVE_DE_SUBIR]: 'documentos' } },
}

const DIA = 86_400_000
const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA)

function textoDeFaltan(dias: number): string {
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${String(dias)} días`
}

function avisoDelVencimiento(documentos: readonly DocumentoDelResumen[], hoy: string) {
  const vigilados = documentos.filter((d) => d.estado === 'aprobado' && d.vence && d.venceEl)
  if (vigilados.some((d) => estaVencido(d.venceEl, hoy))) return 'Vencido'
  const proximos = vigilados.flatMap((d) => {
    const dias = diasEntre(hoy, d.venceEl ?? hoy)
    return d.avisoDias !== null && dias <= d.avisoDias ? [dias] : []
  })
  return proximos.length === 0 ? null : textoDeFaltan(Math.min(...proximos))
}

function avisoDeDocumentos(
  documentos: readonly DocumentoDelResumen[],
  hayMas: boolean,
  hoy: string,
): string | null {
  const porAprobar = documentos.filter((d) => d.estado === 'subido').length
  if (porAprobar > 0) return `${String(porAprobar)}${hayMas ? '+' : ''} por aprobar`
  return avisoDelVencimiento(documentos, hoy)
}

/**
 * El resumen, de lo leído con `tope + 1` (`hoy` = el día de la empresa, `AAAA-MM-DD`). Con más que el tope no dice cuántos aprobados: no sería exacto. «Subir
 * documentos» sólo con `logistica.documentos.subir` en el origen.
 */
export function resumenDeDocumentos(pedido: {
  leidos: readonly DocumentoDelResumen[]
  hoy: string
  puedeSubir: boolean
}): ResumenDeTarjeta {
  const hayMas = pedido.leidos.length > TOPE_DEL_RESUMEN_DE_DOCUMENTOS
  const documentos = pedido.leidos.slice(0, TOPE_DEL_RESUMEN_DE_DOCUMENTOS)
  const acciones = [
    accionDeVer('documentos'),
    ...(pedido.puedeSubir ? [ACCION_SUBIR_DOCUMENTOS] : []),
  ]
  if (documentos.length === 0) return { lineas: ['Sin documentos todavía.'], aviso: null, acciones }
  const cuantos = cantidadAcotada(pedido.leidos.length, TOPE_DEL_RESUMEN_DE_DOCUMENTOS, {
    singular: 'documento',
    plural: 'documentos',
  })
  const aprobados = documentos.filter((d) => d.estado === 'aprobado').length
  return {
    lineas: [hayMas ? cuantos : `${cuantos} · ${String(aprobados)} aprobados`],
    aviso: avisoDeDocumentos(documentos, hayMas, pedido.hoy),
    acciones,
  }
}
