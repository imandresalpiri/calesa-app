// «Comparar cotizaciones»: las filas alineadas por nodo de 2 o 3 cotizaciones guardadas, cada una con el diseño de SU versión recortado a quien mira y SUS valores
// recortados (`cotizacion_hoja_guardada`). Nada se lee de la fórmula: un «grupo» es una sección del diseño, y un nodo que el diseño o los valores de una versión no traen
// es «—» en esa columna. Puro: sin React ni Supabase.
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import type { ItemDeHoja, SeccionDeHoja } from '../hoja'
import type { Formato } from '../nodos'

export type Diferencia = 'igual' | 'mas' | 'menos' | 'distinta'

export type ValorComparado = number | string | null

export type CeldaComparada =
  // La versión no tiene ese nodo, o quien mira no lo ve en ella.
  | { tipo: 'falta' }
  // La columna no se pudo leer.
  | { tipo: 'error' }
  | { tipo: 'valor'; valor: ValorComparado; diferencia: Diferencia }

// El formato de un nodo o `texto` (la variante, por la etiqueta de su opción; el interruptor, «Sí» o «No»).
export type FormatoDeFila = Formato | 'texto'

export type FilaDeComparar =
  | { tipo: 'seccion'; id: string; rotulo: string }
  | {
      tipo: 'nodo'
      nodo: string
      rotulo: string
      formato: FormatoDeFila
      // Los «Decimales» del nodo (glosario), los de la primera columna que lo trae como su rótulo y su formato; sin la clave, «Automático».
      decimales?: number
      celdas: CeldaComparada[]
    }

// Una columna para alinear: la hoja leída o, si su lectura falló, nada (no aporta filas).
export type ColumnaParaAlinear = HojaDeUnaGuardada | null

export const ROTULO_DE_TOTALES = 'Totales'
export const ROTULO_DE_AVANZADO = 'Avanzado'
export const ROTULO_SIN_TITULO = 'Sin título'
export const SI = 'Sí'
export const NO = 'No'

// La sección sintética de lo que suma aparte la tarjeta del total: su clave no choca con la de una sección (`s:<id>`).
const CLAVE_DE_TOTALES = 't'
const claveDeSeccion = (id: string) => `s:${id}`

type Renglon = {
  nodo: string
  rotulo: string
  formato: FormatoDeFila
  decimales?: number
  valor: ValorComparado
}

const conDecimales = (decimales: number | undefined): { decimales?: number } =>
  decimales === undefined ? {} : { decimales }
type SeccionDeUnaColumna = {
  clave: string
  id: string
  rotulo: string | null
  renglones: Renglon[]
}

// Lo que la columna guardó de un nodo, o `undefined` si no vino (no está en la versión o quien mira no lo ve).
type Lector = (nodo: string) => ValorComparado | undefined

const numero = (valor: ValorComparado | undefined): number | null | undefined =>
  valor === undefined ? undefined : typeof valor === 'number' ? valor : null

// La variante guarda la clave de su opción; se muestra su etiqueta. Una clave que la versión no tiene es «sin valor».
function textoDeLaVariante(
  item: Extract<ItemDeHoja, { tipo: 'variante' }>,
  valor: ValorComparado | undefined,
): string | null | undefined {
  if (valor === undefined) {
    return undefined
  }
  return item.opciones.find((opcion) => opcion.clave === valor)?.etiqueta ?? null
}

// La bandera guarda 1 encendida (como la lee `entradasDeLoGuardado`); otro número, apagada.
function textoDelInterruptor(valor: ValorComparado | undefined): string | null | undefined {
  if (valor === undefined) {
    return undefined
  }
  return typeof valor === 'number' ? (valor === 1 ? SI : NO) : null
}

function renglonesDelItem(item: ItemDeHoja, leer: Lector): Renglon[] {
  type Fila = { nodo: string; rotulo: string; formato: FormatoDeFila; decimales?: number }
  const con = (f: Fila, valor: ValorComparado | undefined): Renglon[] =>
    valor === undefined
      ? []
      : [
          {
            nodo: f.nodo,
            rotulo: f.rotulo,
            formato: f.formato,
            ...conDecimales(f.decimales),
            valor,
          },
        ]
  const propia = (
    i: { nodo: string; etiqueta: string },
    formato: FormatoDeFila,
    decimales?: number,
  ): Fila => ({ nodo: i.nodo, rotulo: i.etiqueta, formato, decimales })
  switch (item.tipo) {
    case 'celda': {
      const principal = con(propia(item, item.formato, item.decimales), numero(leer(item.nodo)))
      const s = item.secundario
      if (s === null) {
        return principal
      }
      const rotulo = `${item.etiqueta} (${s.formato === 'pct' ? '%' : 'monto'})`
      return [
        ...principal,
        ...con(
          { nodo: s.nodo, rotulo, formato: s.formato, decimales: s.decimales },
          numero(leer(s.nodo)),
        ),
      ]
    }
    case 'subtotal':
      return con(propia(item, item.formato, item.decimales), numero(leer(item.nodo)))
    case 'variante':
      return con(propia(item, 'texto'), textoDeLaVariante(item, leer(item.nodo)))
    case 'interruptor':
      return con(propia(item, 'texto'), textoDelInterruptor(leer(item.nodo)))
    case 'atajos':
      // Los chips de una tabla no suman fila: su nodo ya tiene su celda (`atajos_sin_celda`).
      return []
    case 'total':
      // La tarjeta del total tampoco: su nodo va con lo aparte de la tarjeta, al final.
      return []
    default: {
      const _: never = item
      return _
    }
  }
}

function rotuloDeLaSeccion(seccion: SeccionDeHoja): string | null {
  return seccion.titulo?.trim() || null
}

// Lo que una columna dibuja, en su orden: sus secciones con sus nodos y, al final, lo que suma aparte su tarjeta del total. Cada nodo una vez (el primero gana).
export function seccionesDeUnaColumna(hoja: HojaDeUnaGuardada): SeccionDeUnaColumna[] {
  const valores = hoja.guardado.valores
  const leer: Lector = (nodo) => (valores.has(nodo) ? (valores.get(nodo) ?? null) : undefined)
  const vistos = new Set<string>()
  const unaVez = (renglones: Renglon[]) =>
    renglones.filter((r) => {
      if (vistos.has(r.nodo)) {
        return false
      }
      vistos.add(r.nodo)
      return true
    })
  const secciones: SeccionDeUnaColumna[] = hoja.diseno.secciones.map((seccion) => ({
    clave: claveDeSeccion(seccion.id),
    id: seccion.id,
    rotulo:
      rotuloDeLaSeccion(seccion) ??
      (seccion.presentacion === 'avanzado' ? ROTULO_DE_AVANZADO : null),
    renglones: unaVez(seccion.items.flatMap((item) => renglonesDelItem(item, leer))),
  }))
  const aparte = unaVez(
    hoja.diseno.tarjetaTotal.secundarios.flatMap((n) => {
      const valor = numero(leer(n.nodo))
      return valor === undefined
        ? []
        : [
            {
              nodo: n.nodo,
              rotulo: n.etiqueta,
              formato: n.formato,
              ...conDecimales(n.decimales),
              valor,
            },
          ]
    }),
  )
  return [
    ...secciones,
    { clave: CLAVE_DE_TOTALES, id: 'totales', rotulo: ROTULO_DE_TOTALES, renglones: aparte },
  ]
}

// Mete `clave` tras la posición `despues` si no está; devuelve dónde quedó.
function ubicar(orden: string[], clave: string, despues: number): number {
  const ya = orden.indexOf(clave)
  if (ya !== -1) {
    return ya
  }
  orden.splice(despues + 1, 0, clave)
  return despues + 1
}

// Contra la primera columna: dos números, más, menos o igual (el snapshot ya viene redondeado: igualdad exacta); lo demás, igual o distinto. Lo que la primera no tiene
// y ésta sí, distinto.
export function diferenciaContraLaPrimera(
  referencia: ValorComparado | undefined,
  valor: ValorComparado,
): Diferencia {
  if (referencia === undefined) {
    return 'distinta'
  }
  if (typeof referencia === 'number' && typeof valor === 'number') {
    return valor > referencia ? 'mas' : valor < referencia ? 'menos' : 'igual'
  }
  return referencia === valor ? 'igual' : 'distinta'
}

type NodoUbicado = { rotulo: string; formato: FormatoDeFila; decimales?: number; seccion: string }

type Ubicacion = {
  secciones: string[]
  rotulos: Map<string, string | null>
  ids: Map<string, string>
  nodosDe: Map<string, string[]>
  nodos: Map<string, NodoUbicado>
}

// Los nodos de una sección de una columna, en su lugar: uno nuevo va tras el último suyo ya ubicado en esa sección; uno que ya puso otra columna se queda donde está.
function ubicarLosNodos(u: Ubicacion, seccion: SeccionDeUnaColumna): void {
  const nodos = u.nodosDe.get(seccion.clave) ?? []
  u.nodosDe.set(seccion.clave, nodos)
  let ultimo = -1
  for (const r of seccion.renglones) {
    const ya = u.nodos.get(r.nodo)
    if (ya === undefined) {
      ultimo = ubicar(nodos, r.nodo, ultimo)
      u.nodos.set(r.nodo, {
        rotulo: r.rotulo,
        formato: r.formato,
        ...conDecimales(r.decimales),
        seccion: seccion.clave,
      })
    } else if (ya.seccion === seccion.clave) {
      ultimo = nodos.indexOf(r.nodo)
    }
  }
}

// Las secciones en el orden de la primera columna; las que sólo trae otra, tras la última suya ya ubicada. El rótulo, el de la primera que lo tenga.
function ubicarTodo(porColumna: readonly (SeccionDeUnaColumna[] | null)[]): Ubicacion {
  const u: Ubicacion = {
    secciones: [],
    rotulos: new Map(),
    ids: new Map(),
    nodosDe: new Map(),
    nodos: new Map(),
  }
  for (const secciones of porColumna) {
    let ultima = -1
    for (const seccion of secciones ?? []) {
      ultima = ubicar(u.secciones, seccion.clave, ultima)
      u.ids.set(seccion.clave, seccion.id)
      if (!u.rotulos.get(seccion.clave)) {
        u.rotulos.set(seccion.clave, seccion.rotulo)
      }
      ubicarLosNodos(u, seccion)
    }
  }
  return u
}

type ValoresDeUnaColumna = ReadonlyMap<string, ValorComparado> | null

function celdaDe(
  nodo: string,
  valores: ValoresDeUnaColumna,
  referencia: ValoresDeUnaColumna,
): CeldaComparada {
  if (valores === null) {
    return { tipo: 'error' }
  }
  if (!valores.has(nodo)) {
    return { tipo: 'falta' }
  }
  const valor = valores.get(nodo) ?? null
  if (valores === referencia) {
    return { tipo: 'valor', valor, diferencia: 'igual' }
  }
  const deLaPrimera = referencia?.has(nodo) ? (referencia.get(nodo) ?? null) : undefined
  return { tipo: 'valor', valor, diferencia: diferenciaContraLaPrimera(deLaPrimera, valor) }
}

// Las filas alineadas: por sección (sin las vacías), su encabezado y sus nodos con una celda por columna. La referencia es la primera columna leída.
export function filasAlineadas(columnas: readonly ColumnaParaAlinear[]): FilaDeComparar[] {
  const porColumna = columnas.map((hoja) => (hoja === null ? null : seccionesDeUnaColumna(hoja)))
  const u = ubicarTodo(porColumna)
  const valoresDe: ValoresDeUnaColumna[] = porColumna.map((secciones) =>
    secciones === null
      ? null
      : new Map(secciones.flatMap((s) => s.renglones.map((r) => [r.nodo, r.valor] as const))),
  )
  const referencia = valoresDe.find((v) => v !== null) ?? null
  return u.secciones.flatMap((clave): FilaDeComparar[] => {
    const nodos = (u.nodosDe.get(clave) ?? []).flatMap((nodo): FilaDeComparar[] => {
      const ubicado = u.nodos.get(nodo)
      return ubicado === undefined
        ? []
        : [
            {
              tipo: 'nodo',
              nodo,
              rotulo: ubicado.rotulo,
              formato: ubicado.formato,
              ...conDecimales(ubicado.decimales),
              celdas: valoresDe.map((valores) => celdaDe(nodo, valores, referencia)),
            },
          ]
    })
    if (nodos.length === 0) {
      return []
    }
    const rotulo = u.rotulos.get(clave) ?? ROTULO_SIN_TITULO
    return [{ tipo: 'seccion', id: u.ids.get(clave) ?? clave, rotulo }, ...nodos]
  })
}
