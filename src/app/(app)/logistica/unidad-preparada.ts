import { getDemoraPorDefecto } from '@/modules/empresa'
import { puede } from '@/modules/equipo'
import {
  leerFasesDeOrigen,
  leerFlujoDeOrigen,
  type FaseResumen,
  type FlujoDeOrigen,
} from '@/modules/flujos'
import {
  cadenaDeLaUnidad,
  demoraDeLaUnidad,
  esHuecoConocido,
  leerPasadasDeLaUnidad,
  leerUnidad,
  type CadenaDeLaUnidad,
  type FaseDelCamino,
  type FaseParaLaDemora,
  type HuecoDeLaUnidad,
  type PasadaLeida,
  type UnidadAbierta,
} from '@/modules/logistica'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad } from './huecos-de-la-unidad'

// Lo que sólo pide la página de la unidad: la cadena (las pasadas, la actual y lo que falta), las pasadas leídas (las opciones del filtro del historial y el resumen de
// su tarjeta) y la demora de la unidad en su fase. El drawer de gastos no lo lee.
export type CadenaPreparada = {
  cadena: CadenaDeLaUnidad
  pasadas: PasadaLeida[]
  demora: { dias: number } | null
}

export type UnidadPreparada =
  // No existe, está en la papelera o no se ve: se dicen igual (decir «no tienes permiso» confirmaría que existe).
  | { tipo: 'no_disponible' }
  | { tipo: 'sin_permiso' }
  | {
      tipo: 'lista'
      unidad: UnidadAbierta
      origen: string
      fase: { nombre: string; color: string } | null
      huecos: HuecoDeLaUnidad[]
      aviso: string | null
      cadena: CadenaPreparada | null
    }

// Las fases del flujo con lo que el camino necesita: las de `leerFasesDeOrigen` (nombre, orden, inicial, final, activa) con las salidas de `leerFlujoDeOrigen`. Nulas si
// falta cualquiera de las dos lecturas: la cadena se queda sin «lo que falta» y lo dice.
function fasesDelCamino(
  fases: readonly FaseResumen[] | null,
  flujo: FlujoDeOrigen | null,
): FaseDelCamino[] | null {
  if (fases === null || flujo === null) return null
  const salidas = new Map(flujo.fases.map((f) => [f.id, f.salidas]))
  return fases.map((f) => ({ ...f, salidas: salidas.get(f.id) ?? [] }))
}

type LecturasDeLaCadena = {
  unidad: UnidadAbierta
  fases: readonly FaseResumen[] | null
  flujo: FlujoDeOrigen | null
  leidas: { pasadas: PasadaLeida[]; hayMas: boolean } | null
  demoraPorDefecto: number | null
}

// La fase de hoy para la cadena. Si no está en la lista (de otro flujo), su nombre sale de la última entrada del historial.
function faseDeHoy({ unidad, fases, leidas }: LecturasDeLaCadena) {
  const enLaLista = fases?.find((f) => f.id === unidad.faseId)
  const vista = enLaLista ?? leidas?.pasadas.find((p) => p.aFaseId === unidad.faseId)
  return {
    faseId: unidad.faseId,
    nombre: vista?.nombre ?? null,
    color: vista?.color ?? null,
    activa: vista?.activa ?? true,
    desde: unidad.faseDesde,
  }
}

// Lo que la demora mira de la fase de hoy: si es de logística y su umbral (del flujo) y si es final (de la lista). Nula si falta cualquiera.
function faseParaLaDemora({ unidad, fases, flujo }: LecturasDeLaCadena): FaseParaLaDemora | null {
  const fase = fases?.find((f) => f.id === unidad.faseId)
  const paraMover = flujo?.fases.find((f) => f.id === unidad.faseId)
  if (!fase || !paraMover) return null
  return {
    esLogistica: paraMover.esLogistica,
    esFinal: fase.esFinal,
    demoraDias: paraMover.demoraDias,
  }
}

function prepararLaCadena(lecturas: LecturasDeLaCadena): CadenaPreparada {
  const { unidad, fases, flujo, leidas, demoraPorDefecto } = lecturas
  const pasadas = leidas ? leidas.pasadas : null
  const cadena = cadenaDeLaUnidad({
    pasadas,
    hayMas: leidas !== null && leidas.hayMas,
    actual: faseDeHoy(lecturas),
    fases: fasesDelCamino(fases, flujo),
  })
  const demora = demoraDeLaUnidad({
    faseDesde: unidad.faseDesde,
    fase: faseParaLaDemora(lecturas),
    demoraPorDefecto,
    reglaDeDemoraActiva: flujo !== null && flujo.reglasActivas.includes('alerta_demora'),
    situacion: unidad.situacion,
  })
  return { cadena, pasadas: pasadas ?? [], demora }
}

// `?hueco=` deja ese hueco abierto desde el principio en los bloques; una clave desconocida se ignora.
function conElHuecoAbierto(huecos: HuecoDeLaUnidad[], huecoAbierto: string | undefined) {
  if (!esHuecoConocido(huecoAbierto)) return huecos
  return huecos.map((hueco) =>
    hueco.clave === huecoAbierto ? { ...hueco, abiertoAlInicio: true } : hueco,
  )
}

const faseDeLaLista = (fases: readonly FaseResumen[] | null, faseId: string | null) =>
  fases?.find((una) => una.id === faseId) ?? null

// Las dos lecturas que sólo pide la cadena: las pasadas (nulas si fallan: la cadena lo dice) y la demora por defecto de la empresa.
async function leerParaLaCadena(
  unidad: UnidadAbierta,
): Promise<Pick<LecturasDeLaCadena, 'leidas' | 'demoraPorDefecto'>> {
  const [pasadas, demoraPorDefecto] = await Promise.all([
    leerPasadasDeLaUnidad(unidad.id),
    getDemoraPorDefecto(),
  ])
  return { leidas: pasadas.ok ? pasadas.data : null, demoraPorDefecto }
}

// Todo lo que pide dibujar la unidad con ese id, para quien mira: la unidad bajo la RLS de `vehiculos`, `logistica.ver` en su origen, el origen, la fase y los huecos que se dibujan (permisos y reglas del flujo).
// La comparten la página de la unidad y el drawer de gastos. Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar»; el del flujo del origen no tumba nada: deja apagados los huecos que
// piden una regla y lo dice (`aviso`). `huecoAbierto` (`?hueco=`) deja ese hueco abierto desde el principio en los bloques; una clave desconocida se ignora. Con `conCadena` (la página), lee además
// las pasadas y la demora por defecto, en paralelo con lo demás: un fallo de esas lecturas degrada la cadena, nunca la página.
export async function prepararUnidad(
  id: string,
  permisos: Permisos,
  huecoAbierto?: string,
  { conCadena = false }: { conCadena?: boolean } = {},
): Promise<UnidadPreparada> {
  const unidad = datosO(await leerUnidad(id))
  if (!unidad) return { tipo: 'no_disponible' }
  if (!puede(permisos, 'logistica.ver', unidad.origenId)) return { tipo: 'sin_permiso' }
  const [origenes, fases, flujo, paraLaCadena] = await Promise.all([
    getOrigenes(true),
    leerFasesDeOrigen(unidad.origenId),
    leerFlujoDeOrigen(unidad.origenId),
    conCadena ? leerParaLaCadena(unidad) : null,
  ])
  const origen = datosO(origenes).find((uno) => uno.id === unidad.origenId)
  const listaDeFases = fases.ok ? fases.data : null
  const { huecos, aviso } = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos, flujo })
  return {
    tipo: 'lista',
    unidad,
    origen: origen?.nombre ?? '',
    fase: faseDeLaLista(listaDeFases, unidad.faseId),
    huecos: conElHuecoAbierto(huecos, huecoAbierto),
    aviso,
    cadena:
      paraLaCadena &&
      prepararLaCadena({
        ...paraLaCadena,
        unidad,
        fases: listaDeFases,
        flujo: flujo.ok ? flujo.data : null,
      }),
  }
}
