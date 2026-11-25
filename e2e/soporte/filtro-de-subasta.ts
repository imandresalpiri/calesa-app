// El terreno de `e2e/vehiculos-filtro-situacion.spec.ts`: un origen de subasta con las fases «En subasta» (la subasta, inicial) y «Comprado», un vehículo en
// cada situación (y con cada cierre) y otro origen, manual, para cambiar de pestaña. Por SQL de servicio; se borra al empezar y al terminar.
import { admin } from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

const DIA = 86_400_000
// La zona de la empresa en el e2e (`ajustes_empresa.zona_horaria` por defecto): UTC−4 todo el año.
const DESFASE_DE_LA_PAZ = 4 * 3_600_000

export type TerrenoDeSubasta = {
  origen: string
  otro: string
  fases: { enSubasta: string; comprado: string }
}

const claveDe = (p: string) => `${PREFIJO_CLAVE_E2E}fsit_${p}`
const otraClaveDe = (p: string) => `${PREFIJO_CLAVE_E2E}fsit_otro_${p}`
const sinPrefijo = (clave: string) => clave.slice(PREFIJO_CLAVE_E2E.length)

export const titulosDeSubasta = (p: string) => ({
  vivaHoy: `E2E Viva hoy ${p}`,
  enSubasta: `E2E En subasta ${p}`,
  vivaSinFecha: `E2E Viva sin fecha ${p}`,
  sinResolverNueva: `E2E Sin resolver nueva ${p}`,
  sinResolverVieja: `E2E Sin resolver vieja ${p}`,
  noGanada: `E2E No ganada ${p}`,
  comprado: `E2E Comprado ${p}`,
  sinFase: `E2E Sin fase ${p}`,
})

export type TituloDeSubasta = keyof ReturnType<typeof titulosDeSubasta>

// Lo que rellena el orden por cierre hasta pasar de una página de 10 (en «Comprado», ninguna en subasta).
export const RELLENO = 6
export const tituloDeRelleno = (p: string, i: number) => `E2E Relleno ${i} ${p}`

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

// Un cierre que cae hoy en la zona de la empresa: dentro de una hora, o a mitad de camino de la medianoche si falta menos.
function cierreDeHoy(ahora: number): string {
  const medianoche = Math.ceil((ahora - DESFASE_DE_LA_PAZ + 1) / DIA) * DIA + DESFASE_DE_LA_PAZ
  return new Date(ahora + Math.min(3_600_000, (medianoche - ahora) / 2)).toISOString()
}

export async function borrarTerrenoDeSubasta(p: string): Promise<void> {
  await borrarVehiculosDe([claveDe(p), otraClaveDe(p)])
  await borrarOrigenes([claveDe(p), otraClaveDe(p)])
}

// «En subasta» (la subasta, inicial) y «Comprado».
async function crearFases(origen: string): Promise<TerrenoDeSubasta['fases']> {
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo')
  const de = { flujo_id: flujo.data?.id }
  const fases = await cliente
    .from('fases')
    .insert([
      { ...de, nombre: 'En subasta', orden: 1, es_inicial: true, es_subasta: true },
      { ...de, nombre: 'Comprado', orden: 2, es_inicial: false, es_subasta: false },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(fases.error, 'crear las fases')
  const fase = (nombre: string) => fases.data?.find((f) => f.nombre === nombre)?.id ?? ''
  return { enSubasta: fase('En subasta'), comprado: fase('Comprado') }
}

// Cada uno quedó en la situación que se pensó (la calcula la base).
function exigirSituaciones(
  t: ReturnType<typeof titulosDeSubasta>,
  filas: { titulo: string; situacion: string }[],
): void {
  const esperadas: [string, string][] = [
    [t.vivaHoy, 'en_subasta'],
    [t.enSubasta, 'en_subasta'],
    [t.vivaSinFecha, 'en_subasta'],
    [t.sinResolverNueva, 'sin_resolver'],
    [t.sinResolverVieja, 'sin_resolver'],
    [t.noGanada, 'no_ganada'],
    [t.comprado, 'fase'],
    [t.sinFase, 'fase'],
  ]
  for (const [titulo, situacion] of esperadas) {
    const quedo = filas.find((v) => v.titulo === titulo)?.situacion
    if (quedo !== situacion) {
      throw new Error(`«${titulo}» quedó ${quedo} y debía ser ${situacion}.`)
    }
  }
}

// Uno con la subasta viva que cierra hoy, uno que cierra en 5 días, uno vivo sin fecha, dos con la subasta terminada (de 2020 y de 2015), uno marcado
// «No ganada», uno ya «Comprado», uno sin fase ni subasta y el relleno.
export async function sembrarTerrenoDeSubasta(p: string): Promise<TerrenoDeSubasta> {
  const origen = await crearOrigenDePrueba(`E2E Situación filtro ${p}`, sinPrefijo(claveDe(p)), {
    tipo: 'subasta',
    plataformas: ['copart'],
  })
  const otro = await crearOrigenDePrueba(`E2E Otro origen ${p}`, sinPrefijo(otraClaveDe(p)))
  const fases = await crearFases(origen.id)
  const fase = (nombre: 'En subasta' | 'Comprado') =>
    nombre === 'En subasta' ? fases.enSubasta : fases.comprado
  const t = titulosDeSubasta(p)
  const ahora = Date.now()
  const hace = new Date(ahora - 2 * DIA).toISOString()
  const hoy = cierreDeHoy(ahora)
  const futuro = new Date(ahora + 5 * DIA).toISOString()
  const terminada = { estado_subasta: 'terminada', subasta_en: hace }
  const enSubasta = { origen_id: origen.id, fase_id: fase('En subasta'), fase_desde: hace }
  const filas = await admin()
    .from('vehiculos')
    .insert([
      {
        ...enSubasta,
        titulo: t.vivaHoy,
        anio: 2022,
        estado_subasta: 'abierta',
        subasta_en: hoy,
        subasta_fin_en: hoy,
      },
      {
        ...enSubasta,
        titulo: t.enSubasta,
        anio: 2021,
        estado_subasta: 'abierta',
        subasta_en: futuro,
        subasta_fin_en: futuro,
      },
      { ...enSubasta, titulo: t.vivaSinFecha, anio: 2021, estado_subasta: 'abierta' },
      { ...enSubasta, titulo: t.sinResolverNueva, anio: 2020, ...terminada },
      { ...enSubasta, titulo: t.sinResolverVieja, anio: 2015, ...terminada },
      {
        ...enSubasta,
        titulo: t.noGanada,
        anio: 2020,
        ...terminada,
        subasta_resultado: 'no_ganada',
        subasta_resuelta_en: hace,
      },
      { origen_id: origen.id, titulo: t.comprado, anio: 2020, fase_id: fase('Comprado') },
      { origen_id: origen.id, titulo: t.sinFase, anio: 2019 },
      ...Array.from({ length: RELLENO }, (_, i) => ({
        origen_id: origen.id,
        titulo: tituloDeRelleno(p, i + 1),
        anio: 2018,
        fase_id: fase('Comprado'),
      })),
    ])
    .select('titulo, situacion')
    .returns<{ titulo: string; situacion: string }[]>()
  exigir(filas.error, 'cargar los vehículos')
  exigirSituaciones(t, filas.data ?? [])
  return { origen: origen.id, otro: otro.id, fases }
}
