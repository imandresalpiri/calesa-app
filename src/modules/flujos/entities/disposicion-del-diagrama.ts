// El acomodo automático del diagrama del flujo (`DiagramaDelFlujo`): dónde va cada fase sin posición guardada y la ruta de cada salida. Se calcula del
// orden de las fases (`docs/DECISIONES.md` › «Flujos»): una columna por fase, de izquierda a derecha, en el orden de la base (las jubiladas en su lugar).
// Con posiciones guardadas, las cajas van donde las dejaron y las flechas siguen su ruta (`disponerConPosiciones`, `trazado-de-salidas.ts`).
// - Rectas: las salidas a la fase siguiente.
// - Ramas (saltos hacia adelante): un arco arriba. Vueltas atrás: un arco abajo, también a la fase vecina (no pisa la recta).
// - Sin cruces: los arcos se ubican del menor alcance al mayor; si el lado preferido cruza a otro, va al otro lado; si los dos cruzan, se queda en el
//   preferido marcado `cruza` (raro y aceptado). El carril de un arco es uno más que el mayor de los arcos de su lado que quedan adentro.
import { trazarSalida, type LimitesDelDibujo, type RutaDeSalida } from './trazado-de-salidas'

// Puro: sin I/O ni React. Las medidas llegan en px, calculadas desde `rem` (`medidasDelDiagrama`): con el texto al 200 % el dibujo crece con él.

export type MedidasDelDiagrama = {
  // La caja de una fase.
  ancho: number
  alto: number
  // Entre dos cajas vecinas.
  separacion: number
  // Lo que sube (o baja) cada carril de arcos.
  carril: number
  // Alrededor de todo.
  margen: number
}

export function medidasDelDiagrama(rem: number): MedidasDelDiagrama {
  return { ancho: 14 * rem, alto: 8 * rem, separacion: 6 * rem, carril: 2 * rem, margen: 2 * rem }
}

export type Punto = { x: number; y: number }
export type LadoDelArco = 'arriba' | 'abajo'

export type NodoDelDiagrama = { id: string; columna: number; x: number; y: number }

export type FlechaDelDiagrama = {
  id: string
  de: string
  a: string
  forma: 'recta' | 'arco'
  // Nulo en una recta.
  lado: LadoDelArco | null
  // 0 en una recta; desde 1 en un arco (el 1 es el más cercano a las cajas).
  carril: number
  // El camino, en orden: dos puntos una recta, cuatro un arco (sale, sube o baja, cruza, llega).
  puntos: Punto[]
  // Dónde va el nombre de la salida.
  etiqueta: Punto
  haciaAtras: boolean
  // El caso raro: cruza a otro arco en los dos lados.
  cruza: boolean
  // Lo que lleva la flecha a donde estén las cajas (`trazarSalida`).
  ruta: RutaDeSalida
}

export type DisposicionDelDiagrama = {
  nodos: NodoDelDiagrama[]
  flechas: FlechaDelDiagrama[]
  ancho: number
  alto: number
  // Lo que ocupa el dibujo; en el acomodo automático empieza en 0 y mide `ancho` × `alto`.
  limites: LimitesDelDibujo
  medidas: MedidasDelDiagrama
}

type Arco = {
  id: string
  de: string
  a: string
  desde: number
  hasta: number
  // Las columnas de sus puntas, de menor a mayor.
  min: number
  max: number
  lado: LadoDelArco
  carril: number
  cruza: boolean
}

// Dos arcos del mismo lado se cruzan si sus tramos se solapan a medias; compartir una punta, o quedar uno adentro del otro, no cuenta.
function seCruzan(a: Pick<Arco, 'min' | 'max'>, b: Pick<Arco, 'min' | 'max'>): boolean {
  return (
    (a.min < b.min && b.min < a.max && a.max < b.max) ||
    (b.min < a.min && a.min < b.max && b.max < a.max)
  )
}

const adentro = (chico: Pick<Arco, 'min' | 'max'>, grande: Pick<Arco, 'min' | 'max'>) =>
  grande.min <= chico.min && chico.max <= grande.max

const otroLado = (lado: LadoDelArco): LadoDelArco => (lado === 'arriba' ? 'abajo' : 'arriba')

// Ubica los arcos del menor alcance al mayor (empate: la menor columna, después el id): así los de adentro ya tienen carril cuando llega el de afuera.
function ubicarArcos(arcos: Omit<Arco, 'lado' | 'carril' | 'cruza'>[]): Arco[] {
  const orden = [...arcos].sort(
    (x, y) => x.max - x.min - (y.max - y.min) || x.min - y.min || x.id.localeCompare(y.id),
  )
  const ubicados: Arco[] = []
  for (const arco of orden) {
    const preferido: LadoDelArco = arco.hasta > arco.desde ? 'arriba' : 'abajo'
    const cruzaEn = (lado: LadoDelArco) =>
      ubicados.some((u) => u.lado === lado && seCruzan(u, arco))
    const lado = !cruzaEn(preferido)
      ? preferido
      : !cruzaEn(otroLado(preferido))
        ? otroLado(preferido)
        : preferido
    const cruza = cruzaEn(lado)
    const carril =
      1 +
      Math.max(
        0,
        ...ubicados.filter((u) => u.lado === lado && adentro(u, arco)).map((u) => u.carril),
      )
    ubicados.push({ ...arco, lado, carril, cruza })
  }
  return ubicados
}

// Dónde sale o llega cada arco en el borde de su caja (la x, por `<id del arco>|de` o `|a`): los que van hacia la izquierda en la mitad izquierda, hacia la
// derecha en la derecha, y el de afuera (el de mayor carril) más cerca del centro, para que la subida de uno no corte el tramo del otro.
function puertosDe(
  arcos: readonly Arco[],
  nodos: ReadonlyMap<string, NodoDelDiagrama>,
  m: MedidasDelDiagrama,
): Map<string, number> {
  type Punta = { arco: Arco; extremo: 'de' | 'a'; faseId: string; haciaLaIzquierda: boolean }
  const grupos = new Map<string, Punta[]>()
  for (const arco of arcos) {
    const puntas: Punta[] = [
      { arco, extremo: 'de', faseId: arco.de, haciaLaIzquierda: arco.hasta < arco.desde },
      { arco, extremo: 'a', faseId: arco.a, haciaLaIzquierda: arco.desde < arco.hasta },
    ]
    for (const punta of puntas) {
      const clave = `${punta.faseId}|${arco.lado}|${punta.haciaLaIzquierda ? 'izquierda' : 'derecha'}`
      grupos.set(clave, [...(grupos.get(clave) ?? []), punta])
    }
  }
  const puertos = new Map<string, number>()
  for (const grupo of grupos.values()) {
    const primera = grupo[0]
    const nodo = primera ? nodos.get(primera.faseId) : undefined
    if (!primera || !nodo) continue
    const centro = nodo.x + m.ancho / 2
    const paso = m.ancho / 2 / (grupo.length + 1)
    const signo = primera.haciaLaIzquierda ? -1 : 1
    // El de afuera primero: queda más cerca del centro.
    const ordenados = [...grupo].sort(
      (x, y) =>
        y.arco.carril - x.arco.carril ||
        y.arco.max - y.arco.min - (x.arco.max - x.arco.min) ||
        x.arco.id.localeCompare(y.arco.id),
    )
    ordenados.forEach((punta, k) => {
      puertos.set(`${punta.arco.id}|${punta.extremo}`, centro + signo * paso * (k + 1))
    })
  }
  return puertos
}

type Salida = { t: TransicionDelDiagrama; desde: number; hasta: number }

function flechaRecta(
  { t }: Salida,
  de: NodoDelDiagrama,
  a: NodoDelDiagrama,
  m: MedidasDelDiagrama,
): FlechaDelDiagrama {
  const ruta: RutaDeSalida = { forma: 'recta', lado: null, carril: 0, puertoDe: 0, puertoA: 0 }
  return {
    id: t.id,
    de: t.deFaseId,
    a: t.aFaseId,
    forma: 'recta',
    lado: null,
    carril: 0,
    ...trazarSalida(de, a, ruta, m),
    haciaAtras: false,
    cruza: false,
    ruta,
  }
}

function flechaArco(
  arco: Arco,
  cajas: { de: NodoDelDiagrama; a: NodoDelDiagrama },
  puertos: ReadonlyMap<string, number>,
  m: MedidasDelDiagrama,
): FlechaDelDiagrama {
  const { de, a } = cajas
  const ruta: RutaDeSalida = {
    forma: 'arco',
    lado: arco.lado,
    carril: arco.carril,
    puertoDe: (puertos.get(`${arco.id}|de`) ?? de.x) - de.x,
    puertoA: (puertos.get(`${arco.id}|a`) ?? a.x) - a.x,
  }
  return {
    id: arco.id,
    de: arco.de,
    a: arco.a,
    forma: 'arco',
    lado: arco.lado,
    carril: arco.carril,
    ...trazarSalida(de, a, ruta, m),
    haciaAtras: arco.hasta < arco.desde,
    cruza: arco.cruza,
    ruta,
  }
}

const mayorCarril = (arcos: readonly Arco[], lado: LadoDelArco) =>
  Math.max(0, ...arcos.filter((a) => a.lado === lado).map((a) => a.carril))

type FaseDelDiagrama = { id: string }
type TransicionDelDiagrama = { id: string; deFaseId: string; aFaseId: string }

export function disponerDiagrama(
  fases: readonly FaseDelDiagrama[],
  transiciones: readonly TransicionDelDiagrama[],
  m: MedidasDelDiagrama,
): DisposicionDelDiagrama {
  const columna = new Map(fases.map((f, i) => [f.id, i]))
  // Sólo las salidas entre fases leídas (con el tope, una puede apuntar a una que no llegó) y nunca a sí misma.
  const validas: Salida[] = transiciones.flatMap((t) => {
    const desde = columna.get(t.deFaseId)
    const hasta = columna.get(t.aFaseId)
    return desde === undefined || hasta === undefined || desde === hasta
      ? []
      : [{ t, desde, hasta }]
  })
  const arcos = ubicarArcos(
    validas
      .filter(({ desde, hasta }) => hasta !== desde + 1)
      .map(({ t, desde, hasta }) => ({
        id: t.id,
        de: t.deFaseId,
        a: t.aFaseId,
        desde,
        hasta,
        min: Math.min(desde, hasta),
        max: Math.max(desde, hasta),
      })),
  )
  const carrilesArriba = mayorCarril(arcos, 'arriba')
  const y = m.margen + carrilesArriba * m.carril
  const nodos = fases.map((f, i) => ({
    id: f.id,
    columna: i,
    x: m.margen + i * (m.ancho + m.separacion),
    y,
  }))
  const porId = new Map(nodos.map((n) => [n.id, n]))
  const puertos = puertosDe(arcos, porId, m)
  const porArco = new Map(arcos.map((a) => [a.id, a]))
  const flechas = validas.flatMap((salida) => {
    const de = porId.get(salida.t.deFaseId)
    const a = porId.get(salida.t.aFaseId)
    const arco = porArco.get(salida.t.id)
    if (!de || !a) return []
    return [arco ? flechaArco(arco, { de, a }, puertos, m) : flechaRecta(salida, de, a, m)]
  })
  const ancho =
    2 * m.margen + Math.max(0, fases.length * m.ancho + (fases.length - 1) * m.separacion)
  const alto = 2 * m.margen + (carrilesArriba + mayorCarril(arcos, 'abajo')) * m.carril + m.alto
  return { nodos, flechas, ancho, alto, limites: { x: 0, y: 0, ancho, alto }, medidas: m }
}
