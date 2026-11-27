// El terreno de `logistica-embarques-claros.spec.ts`: el de `sembrarTransporte` con las reglas `contenedor` y `aduana` encendidas en el flujo del origen y su fase marcada «permite
// contenedor» (la base no deja sumar a un contenedor una unidad cuya fase no lo permite), tres vehículos en esa fase, el tercero ya en otro contenedor sin embarque y el primero
// en una declaración de aduana. Todo por la API de administración, como lo dejaría otra persona; `borrarEmbarquesClaros` lo quita en orden (la declaración antes que sus vehículos).
import { admin } from './base'
import { contenedorDe, ponerEn } from './embarques'
import { borrarTransporte, sembrarTransporte, type TerrenoDeTransporte } from './transporte'

export const PREFIJO_DE_DECLARACION_CLARA = 'E2E-CLAROS-'
export const OTRO_CONTENEDOR = 'OTRU2000002'

type Vehiculo = { id: string; titulo: string }

export type TerrenoDeEmbarquesClaros = TerrenoDeTransporte & {
  uno: Vehiculo
  dos: Vehiculo
  tres: Vehiculo
  otroContenedorId: string
  declaracion: { id: string; numero: string }
}

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

// El proyecto del terreno: el origen, sus personas y su naviera no chocan con los de `logistica-transporte`.
const delTerreno = (proyecto: string) => `claros_${proyecto}`

export async function sembrarEmbarquesClaros(proyecto: string): Promise<TerrenoDeEmbarquesClaros> {
  const terreno = await sembrarTransporte(delTerreno(proyecto))
  const cliente = admin()
  const { data: flujo, error: errorDelFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', terreno.origen.id)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDelFlujo, 'leer el flujo del origen')
  // Primero las reglas y después la fase: la base no marca una fase de contenedor si el flujo no lo usa.
  exigir(
    (
      await cliente.from('flujos_reglas').upsert(
        ['contenedor', 'aduana'].map((regla) => ({
          flujo_id: flujo?.id ?? '',
          regla,
          activa: true,
        })),
        { onConflict: 'flujo_id,regla' },
      )
    ).error,
    'encender las reglas de contenedor y aduana',
  )
  exigir(
    (await cliente.from('fases').update({ permite_contenedor: true }).eq('id', terreno.fase.id))
      .error,
    'marcar la fase como de contenedor',
  )
  const titulos = ['Uno', 'Dos', 'Tres'].map((n) => `E2E Claros ${n} ${proyecto}`)
  const { data: vehiculos, error: errorDeVehiculos } = await cliente
    .from('vehiculos')
    .insert(
      titulos.map((titulo) => ({ origen_id: terreno.origen.id, titulo, fase_id: terreno.fase.id })),
    )
    .select('id, titulo')
    .returns<Vehiculo[]>()
  exigir(errorDeVehiculos, 'cargar los vehículos')
  const vehiculo = (titulo: string): Vehiculo => ({
    id: vehiculos?.find((v) => v.titulo === titulo)?.id ?? '',
    titulo,
  })
  const [uno, dos, tres] = titulos.map(vehiculo) as [Vehiculo, Vehiculo, Vehiculo]

  // El tercero ya viaja en otro contenedor (sin embarque): sumarlo pide confirmar.
  const otroContenedorId = await contenedorDe(terreno.origen.id, OTRO_CONTENEDOR)
  await ponerEn([tres.id], { contenedorId: otroContenedorId })

  // El primero tiene su declaración; los otros dos, ninguna.
  const numero = `${PREFIJO_DE_DECLARACION_CLARA}${proyecto}`
  const { data: declaracion, error: errorDeLaDeclaracion } = await cliente
    .from('declaraciones_aduana')
    .insert({ numero })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDeLaDeclaracion, 'crear la declaración')
  exigir(
    (
      await cliente
        .from('declaraciones_vehiculos')
        .insert({ declaracion_id: declaracion?.id ?? '', vehiculo_id: uno.id })
    ).error,
    'sumar el vehículo a la declaración',
  )
  return {
    ...terreno,
    uno,
    dos,
    tres,
    otroContenedorId,
    declaracion: { id: declaracion?.id ?? '', numero },
  }
}

// Quita la declaración del terreno (y su composición) y después el terreno del transporte con sus embarques y contenedores.
export async function borrarEmbarquesClaros(proyecto: string): Promise<void> {
  const cliente = admin()
  const { data } = await cliente
    .from('declaraciones_aduana')
    .select('id')
    .eq('numero', `${PREFIJO_DE_DECLARACION_CLARA}${proyecto}`)
    .limit(1)
    .returns<{ id: string }[]>()
  const ids = (data ?? []).map((d) => d.id)
  if (ids.length > 0) {
    exigir(
      (await cliente.from('declaraciones_vehiculos').delete().in('declaracion_id', ids)).error,
      'quitar los vehículos de la declaración',
    )
    exigir(
      (await cliente.from('declaraciones_aduana').delete().in('id', ids)).error,
      'borrar la declaración',
    )
  }
  await borrarTransporte(delTerreno(proyecto))
}
