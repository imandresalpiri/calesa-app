// El texto base con que nace cada origen (docs/GLOSARIO.md › «Texto base del origen»): el de un origen de subasta nombra el lote, la subasta y
// la hora del patio; el de uno manual es el mismo sin esas tres líneas. Espejo de `_artes_texto_base_inicial()` en la base, que lo siembra al
// crear un origen (`scripts/guardas/texto-base-de-artes.test.ts` compara los dos). Puro.
import type { TipoDeOrigenDelArte } from './tipos'

const DE_SUBASTA = [
  '{vehiculo}',
  'Lote: {lote}',
  'Año: {anio}',
  'Kilometraje: {kilometraje}',
  'VIN: {vin}',
  'Subasta: {subasta}',
  'Hora del patio: {hora_del_patio}',
  'Total: {total}',
  'Modo de tipo de cambio: {modo}',
  'Válida hasta: {vigencia}',
  'Asesor: {asesor}',
  'Cargo: {cargo}',
  'WhatsApp: {whatsapp}',
] as const

const SOLO_DE_SUBASTA: ReadonlySet<string> = new Set([
  'Lote: {lote}',
  'Subasta: {subasta}',
  'Hora del patio: {hora_del_patio}',
])

export function textoBaseInicial(tipo: TipoDeOrigenDelArte): string {
  const lineas = tipo === 'subasta' ? DE_SUBASTA : DE_SUBASTA.filter((l) => !SOLO_DE_SUBASTA.has(l))
  return lineas.join('\n')
}
