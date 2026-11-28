// Las variables que un texto de una plantilla de arte puede llevar (`{vehiculo}`, `{marca}`…) y cómo se llenan. Hoy con los datos de ejemplo
// (`DATOS_DE_EJEMPLO`); el vehículo y la cotización de verdad los conecta el editor con datos. Sin montos: un monto en el lienzo no pasaría por
// `<Monto>` (el Modo Live). Puro.
import { partesDelTexto, revisarVariables } from '@/shared/lib/texto-con-variables'

export const VARIABLES_DE_ARTE: readonly { clave: string; etiqueta: string }[] = [
  { clave: 'vehiculo', etiqueta: 'Vehículo' },
  { clave: 'marca', etiqueta: 'Marca' },
  { clave: 'modelo', etiqueta: 'Modelo' },
  { clave: 'anio', etiqueta: 'Año' },
  { clave: 'color', etiqueta: 'Color' },
  { clave: 'kilometraje', etiqueta: 'Kilometraje' },
  { clave: 'lote', etiqueta: 'Lote' },
  { clave: 'origen', etiqueta: 'Origen' },
  { clave: 'numero', etiqueta: 'Número de cotización' },
  { clave: 'asesor', etiqueta: 'Asesor' },
]

const CLAVES = VARIABLES_DE_ARTE.map((variable) => variable.clave)

// El texto con cada variable conocida cambiada por su valor, en una sola pasada: lo que trae un valor (`{x}`, `$&`) no se vuelve a leer. Una
// `{…}` desconocida, o conocida sin valor, queda tal cual.
export function textoConValores(texto: string, valores: Readonly<Record<string, string>>): string {
  return partesDelTexto(texto, CLAVES)
    .map((parte) =>
      parte.tipo === 'variable' ? (valores[parte.clave] ?? parte.valor) : parte.valor,
    )
    .join('')
}

// Las `{…}` que el arte no puede llenar, sin repetir y en su orden.
export function variablesDesconocidas(texto: string): string[] {
  return revisarVariables(texto, CLAVES).desconocidas
}

function unidas(elementos: readonly string[]): string {
  const ultimo = elementos.at(-1) ?? ''
  return elementos.length < 2 ? ultimo : `${elementos.slice(0, -1).join(', ')} y ${ultimo}`
}

// El aviso del inspector: «{x} no es un dato que el arte pueda llenar.»; `null` si todas valen.
export function textoDeVariablesDesconocidas(claves: readonly string[]): string | null {
  if (claves.length === 0) {
    return null
  }
  const escritas = unidas(claves.map((clave) => `{${clave}}`))
  return claves.length === 1
    ? `${escritas} no es un dato que el arte pueda llenar.`
    : `${escritas} no son datos que el arte pueda llenar.`
}
