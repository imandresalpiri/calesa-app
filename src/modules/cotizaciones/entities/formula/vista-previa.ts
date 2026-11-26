// La vista previa del editor de la fórmula (4.21-3a-2, P5): `evaluar()` con las cifras de prueba (los datos en 0, las opciones apagadas, la variante por defecto, los
// tipos de cambio de hoy y las tablas vivas) o, en la planilla, con la unidad de ejemplo y el modo de tipo de cambio elegido. Puro y nunca lanza: lo que el motor
// rechaza es un resultado («no calcula»), no una excepción (un modo que no cubre un bucket, una variante sin opción por defecto). Lo que dice cada fila sale de
// `cifraDeLaFila()` con un solo recorrido de los resultados, que el editor arma una vez por cambio aplicado.
import type { Formula, ModoDeCambio } from '../formula'
import { evaluar } from '../motor'
import { ErrorDelMotor } from '../motor-errores'
import type { CodigoDeFaltante, Estado, ValorGuardado } from '../motor-contexto'
import type { Formato, Nodo } from '../nodos'
import { entradaDePrueba, type TerrenoDePrueba } from './terreno-de-prueba'
import { entradaDeLaUnidad, UNIDAD_EN_CEROS, type UnidadDeEjemplo } from './unidad-de-ejemplo'

// `monedaBs`: la moneda del tipo de cambio que divide el total (`moneda_a`); nula si no se la conoce.
export type TotalesDeLaVistaPrevia = {
  usd: number | null
  bs: number | null
  monedaBs: string | null
}

// El subtotal de un grupo (`totales.grupos` del motor): sus dólares, su moneda local y si se dibuja (no todos sus miembros quedan fuera de la variante).
export type GrupoDeLaVistaPrevia = { usd: number | null; bs: number | null; seDibuja: boolean }

export type VistaPrevia =
  // Aún no hay fórmula validada: lo que valga se dice en la fila marcada.
  | { tipo: 'no_valida' }
  // El motor la rechazó con lo de prueba (p. ej. una variante sin opción por defecto).
  | { tipo: 'no_calcula' }
  | {
      tipo: 'calculada'
      valores: ReadonlyMap<string, ValorGuardado>
      estados: ReadonlyMap<string, Estado>
      // El primer faltante que nació en cada nodo.
      faltantes: ReadonlyMap<string, CodigoDeFaltante>
      totales: TotalesDeLaVistaPrevia
      // Por grupo, en el orden de `grupos`; vacío sin grupos.
      grupos: ReadonlyMap<string, GrupoDeLaVistaPrevia>
    }

// La moneda de los Bs: la del tipo de cambio de `total_en` (el del modo, si hay uno) o, sin él, el primero de `buckets`.
function monedaDeLosBs(
  formula: Formula,
  terreno: TerrenoDePrueba,
  modo: ModoDeCambio | undefined,
): string | null {
  const { total_en, buckets } = modo ?? formula.definicion
  const id = total_en ?? Object.values(buckets ?? {})[0]
  const nodo = formula.definicion.nodos.find((n) => n.id === id)
  return nodo?.tipo === 'tipo_cambio' ? (terreno.monedas[nodo.clave] ?? null) : null
}

// `formulaValidada` es la que devolvió `validarFormula()` (nula si no validó). Sin unidad, las cifras de prueba; sin modo, los `buckets` y `total_en` de la fórmula.
// Nunca lanza ni toca lo que recibe.
export function calcularLaVistaPrevia(
  formulaValidada: Formula | null,
  terreno: TerrenoDePrueba,
  unidad: UnidadDeEjemplo = UNIDAD_EN_CEROS,
  modo?: ModoDeCambio,
): VistaPrevia {
  if (formulaValidada === null) return { tipo: 'no_valida' }
  try {
    const entrada = entradaDePrueba(terreno, entradaDeLaUnidad(formulaValidada, unidad))
    const r = evaluar(formulaValidada, entrada, modo)
    const faltantes = new Map<string, CodigoDeFaltante>()
    for (const f of r.faltantes) {
      if (!faltantes.has(f.donde)) faltantes.set(f.donde, f.codigo)
    }
    return {
      tipo: 'calculada',
      valores: new Map(Object.entries(r.valores)),
      estados: new Map(Object.entries(r.estados)),
      faltantes,
      totales: {
        usd: r.totales.usd,
        bs: r.totales.bs,
        monedaBs: monedaDeLosBs(formulaValidada, terreno, modo),
      },
      grupos: new Map(
        Object.entries(r.totales.grupos).map(([id, g]) => [
          id,
          { usd: g.usd, bs: g.bs, seDibuja: g.se_dibuja },
        ]),
      ),
    }
  } catch (error) {
    if (error instanceof ErrorDelMotor) return { tipo: 'no_calcula' }
    throw error
  }
}

export type CifraDeLaFila =
  // Una bandera, o sin vista calculada: la fila no dibuja nada.
  | { tipo: 'nada' }
  // `decimales`, los «Decimales» del nodo (glosario), sólo si los trae: la columna Ejemplo los muestra como la hoja.
  | { tipo: 'valor'; valor: number; formato: Formato | undefined; decimales?: number }
  // La variante (su clave) o un texto.
  | { tipo: 'texto'; texto: string }
  // Sin cifra: `faltante` es lo que falta en esta fila; nulo, algo aguas arriba.
  | { tipo: 'sin_cifra'; faltante: CodigoDeFaltante | null }
  | { tipo: 'apagada'; estado: Exclude<Estado, 'activo'> }

export function cifraDeLaFila(vista: VistaPrevia, nodo: Nodo): CifraDeLaFila {
  if (vista.tipo !== 'calculada' || nodo.tipo === 'bandera') return { tipo: 'nada' }
  const estado = vista.estados.get(nodo.id)
  if (estado !== undefined && estado !== 'activo') return { tipo: 'apagada', estado }
  const valor = vista.valores.get(nodo.id)
  if (typeof valor === 'string') return { tipo: 'texto', texto: valor }
  if (valor === undefined || valor === null) {
    return { tipo: 'sin_cifra', faltante: vista.faltantes.get(nodo.id) ?? null }
  }
  return {
    tipo: 'valor',
    valor,
    formato: nodo.formato,
    ...(nodo.decimales === undefined ? {} : { decimales: nodo.decimales }),
  }
}
