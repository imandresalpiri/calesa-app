// La cadena de la unidad (`docs/GLOSARIO.md` › «Cadena de la unidad»): la fila de fases de la página de la unidad. Las pasadas salen de `historial_fases`, una por
// cada entrada y en orden (las repetidas no se juntan: juntarlas rompería el orden en el tiempo y el «cuándo entró y salió» de cada una); la actual, de la unidad; las
// que faltan, del camino principal del flujo. Sin I/O: lo leen `infra/mover/historial.ts` y `flujos`, y lo junta `src/app`.

/** Una fase del flujo del origen, con lo que el camino necesita (`leerFasesDeOrigen` + las `salidas` de `leerFlujoDeOrigen`). */
export type FaseDelCamino = {
  id: string
  nombre: string
  color: string
  orden: number
  esInicial: boolean
  esFinal: boolean
  activa: boolean
  salidas: readonly string[]
}

/** Una fila de `historial_fases` de la unidad: la entrada a `aFaseId`, con su fase embebida (puede ser de otro flujo si el vehículo cambió de origen). */
export type PasadaLeida = {
  historialId: number
  aFaseId: string
  nombre: string
  color: string | null
  activa: boolean
  entro: string
  quienId: string | null
  quien: string | null
  nota: string | null
}

export type TipoDeNodo = 'pasada' | 'actual' | 'falta'

export type NodoDeLaCadena = {
  // Lo que va en `?fase_vista=`: el id de la fase para la actual y las que faltan; `pasada-<id del historial>` para una pasada (una fase puede estar varias veces).
  clave: string
  faseId: string | null
  nombre: string
  color: string | null
  tipo: TipoDeNodo
  jubilada: boolean
  // Cuándo entró (ISO), quién la movió ahí y con qué nota. Nulos en lo que falta y si no se sabe.
  entro: string | null
  quienEntro: string | null
  notaEntro: string | null
  // Cuándo salió, quién la sacó y con qué nota. Sólo en una pasada.
  salio: string | null
  quienSalio: string | null
  notaSalio: string | null
}

export type CadenaDeLaUnidad = {
  nodos: NodoDeLaCadena[]
  // El tope cortó: hay cambios más viejos que los que se ven (la marca «Cambios anteriores» abre la tarjeta Historial).
  hayAnteriores: boolean
  // Lo que no se pudo leer: sin el flujo, no hay «lo que falta»; sin el historial, no hay pasadas. La cadena se degrada sin romperse.
  sinCamino: boolean
  sinPasadas: boolean
}

export const CLAVE_SIN_FASE = 'sin_fase'
export const NOMBRE_SIN_FASE = 'Sin fase'
export const AVISO_SIN_CAMINO = 'No pudimos leer el camino de este flujo.'
export const AVISO_SIN_PASADAS = 'No pudimos leer las fases pasadas.'

const prefijoDePasada = 'pasada-'

export const claveDePasada = (historialId: number) => `${prefijoDePasada}${String(historialId)}`

function porOrden(a: FaseDelCamino, b: FaseDelCamino): number {
  return a.orden - b.orden || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/**
 * El camino principal desde una fase: una y otra vez, la salida **activa** de menor `orden` mayor que el del nodo (empate por id), hasta una final o hasta que no hay
 * ninguna. Es la regla de «fase siguiente» de la bandeja (`_bandeja_dia_trabados`) restringida a lo que avanza: el orden crece en cada paso, así que no hay ciclos.
 * Sin fase, todas las iniciales activas por orden. Una fase que no está en el flujo (de otro origen) no tiene camino.
 */
export function caminoPrincipal(
  desde: string | null,
  fases: readonly FaseDelCamino[],
): FaseDelCamino[] {
  if (desde === null) return fases.filter((f) => f.activa && f.esInicial).sort(porOrden)
  const porId = new Map(fases.map((f) => [f.id, f]))
  const camino: FaseDelCamino[] = []
  let nodo = porId.get(desde)
  while (nodo !== undefined && !nodo.esFinal) {
    const orden = nodo.orden
    const siguiente = nodo.salidas
      .map((id) => porId.get(id))
      .filter((f): f is FaseDelCamino => f !== undefined && f.activa && f.orden > orden)
      .sort(porOrden)[0]
    if (siguiente === undefined) break
    camino.push(siguiente)
    nodo = siguiente
  }
  return camino
}

const vacio = {
  entro: null,
  quienEntro: null,
  notaEntro: null,
  salio: null,
  quienSalio: null,
  notaSalio: null,
}

export type PedidoDeLaCadena = {
  // Las filas de `historial_fases` de la unidad, de la más nueva a la más vieja (como se leen), ya cortadas al tope; nulas si no se pudieron leer.
  pasadas: readonly PasadaLeida[] | null
  hayMas: boolean
  actual: {
    faseId: string | null
    nombre: string | null
    color: string | null
    activa: boolean
    desde: string | null
  }
  // Las fases del flujo del origen; nulas si no se pudieron leer.
  fases: readonly FaseDelCamino[] | null
}

function nodosPasados(
  soloPasadas: readonly PasadaLeida[],
  cronologicas: readonly PasadaLeida[],
): NodoDeLaCadena[] {
  return soloPasadas.map((p, i) => {
    const despues = cronologicas[i + 1] ?? null
    return {
      clave: claveDePasada(p.historialId),
      faseId: p.aFaseId,
      nombre: p.nombre,
      color: p.color,
      tipo: 'pasada',
      jubilada: !p.activa,
      entro: p.entro,
      quienEntro: p.quien,
      notaEntro: p.nota,
      salio: despues?.entro ?? null,
      quienSalio: despues?.quien ?? null,
      notaSalio: despues?.nota ?? null,
    }
  })
}

function nodoDeLaActual(
  actual: PedidoDeLaCadena['actual'],
  entrada: PasadaLeida | null,
): NodoDeLaCadena {
  const sinFase = actual.faseId === null
  return {
    ...vacio,
    clave: actual.faseId ?? CLAVE_SIN_FASE,
    faseId: actual.faseId,
    nombre: sinFase ? NOMBRE_SIN_FASE : (actual.nombre ?? NOMBRE_SIN_FASE),
    color: actual.color,
    tipo: 'actual',
    jubilada: !sinFase && !actual.activa,
    entro: actual.desde,
    quienEntro: entrada?.quien ?? null,
    notaEntro: entrada?.nota ?? null,
  }
}

const nodoQueFalta = (f: FaseDelCamino): NodoDeLaCadena => ({
  ...vacio,
  clave: f.id,
  faseId: f.id,
  nombre: f.nombre,
  color: f.color,
  tipo: 'falta',
  jubilada: false,
})

/** La cadena de la unidad: las pasadas en orden de entrada, la actual y lo que falta por el camino principal. */
export function cadenaDeLaUnidad({
  pasadas,
  hayMas,
  actual,
  fases,
}: PedidoDeLaCadena): CadenaDeLaUnidad {
  const cronologicas = [...(pasadas ?? [])].reverse()
  // La última entrada es la de la fase actual (si coincide): no es una pasada, pero dice quién la trajo y con qué nota.
  const ultima = cronologicas.at(-1)
  const entrada = ultima !== undefined && ultima.aFaseId === actual.faseId ? ultima : null
  const soloPasadas = entrada ? cronologicas.slice(0, -1) : cronologicas
  return {
    nodos: [
      ...nodosPasados(soloPasadas, cronologicas),
      nodoDeLaActual(actual, entrada),
      ...(fases ? caminoPrincipal(actual.faseId, fases) : []).map(nodoQueFalta),
    ],
    hayAnteriores: pasadas !== null && hayMas,
    sinCamino: fases === null,
    sinPasadas: pasadas === null,
  }
}
