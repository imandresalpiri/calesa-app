// Números y montos con Intl, en el locale de la empresa. Nunca `toFixed` ni concatenar símbolos.
// En pantalla los montos pasan por <Monto> (Modo Live); esto es el texto que <Monto> imprime.

export const LOCALE_POR_DEFECTO = 'es-BO'

// `fijos`: los `decimales` también son el mínimo (con ceros de relleno). Sin él, son el máximo. Una cifra con decimales fijos se
// redondea antes con `redondear()` (`cifra-fija.ts`): `Intl` no redondea como la base en un casi empate.
type OpcionesNumero = { locale?: string; decimales?: number; fijos?: true }
type OpcionesMonto = { moneda: string; locale?: string; decimales?: number }

// Construir un Intl.NumberFormat es caro y una tabla lo pide cientos de veces con las mismas opciones.
const formateadores = new Map<string, Intl.NumberFormat>()

function formateador(locale: string, opciones: Intl.NumberFormatOptions): Intl.NumberFormat {
  const clave = `${locale}|${JSON.stringify(opciones)}`
  let existente = formateadores.get(clave)
  if (!existente) {
    try {
      existente = new Intl.NumberFormat(locale, opciones)
    } catch {
      // Un locale o una moneda que `Intl` no conoce (un dato mal guardado) no puede tumbar cada
      // pantalla que imprime un número: se formatea con lo de fábrica.
      existente = new Intl.NumberFormat(LOCALE_POR_DEFECTO, { ...opciones, currency: 'USD' })
    }
    formateadores.set(clave, existente)
  }
  return existente
}

// Hasta `decimales` decimales, sin ceros de relleno: 1234.5 → «1.234,5». Con `fijos`, siempre `decimales`: «1.234,50».
export function formatearNumero(valor: number, opciones: OpcionesNumero = {}): string {
  const { locale = LOCALE_POR_DEFECTO, decimales = 2, fijos } = opciones
  return formateador(locale, {
    ...(fijos ? { minimumFractionDigits: decimales } : {}),
    maximumFractionDigits: decimales,
  }).format(valor)
}

// Siempre con los decimales de la moneda (2 por defecto): 1234.5 USD → «USD 1.234,50».
export function formatearMonto(valor: number, opciones: OpcionesMonto): string {
  const { moneda, locale = LOCALE_POR_DEFECTO, decimales = 2 } = opciones
  return formateador(locale, {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)
}

// Recibe una fracción: 0.125 → «12,5%». Los `decimales` son los de los puntos (con `fijos` y 2, 0.125 → «12,50%»).
export function formatearPorcentaje(fraccion: number, opciones: OpcionesNumero = {}): string {
  const { locale = LOCALE_POR_DEFECTO, decimales = 1, fijos } = opciones
  return formateador(locale, {
    style: 'percent',
    ...(fijos ? { minimumFractionDigits: decimales } : {}),
    maximumFractionDigits: decimales,
  }).format(fraccion)
}

// El texto que se abre para editar un número: la precisión completa (15 cifras significativas, las del cast de la base), sin
// separador de miles y con la coma o el punto decimal del locale. No usa los decimales con que se muestra: abrir «1.234,57» y salir
// con Tab emitiría un cambio que nadie hizo. 0.1494 → «0,1494»; 0.1 + 0.2 → «0,3».
export function formatearParaEditar(valor: number, opciones: { locale?: string } = {}): string {
  const { locale = LOCALE_POR_DEFECTO } = opciones
  return formateador(locale, { maximumSignificantDigits: 15, useGrouping: false }).format(valor)
}
