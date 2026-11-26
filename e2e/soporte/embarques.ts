// Embarques y contenedores para los e2e de logística, como los dejaría la base de otra persona: por la API de administración, sin pasar por `transporte_guardar` ni por la regla de
// la fase. Un vehículo va en un contenedor (con naviera y fechas propias si el contenedor no tiene embarque) o en un embarque (sin datos propios: son del embarque). Lo que un spec crea
// así (o tipeando un booking o un contenedor en el hueco) lo quita `borrarEmbarquesDe` antes de borrar el origen: la FK es `restrict`.
import { admin } from './base'

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

type DatosDelEmbarque = Partial<{
  naviera_id: string | null
  puerto_origen_id: string | null
  puerto_destino_id: string | null
  zarpe_el: string | null
  eta_el: string | null
  arribo_el: string | null
}>

/** El contenedor `numero` del origen (lo busca o lo crea), en el embarque dado o sin él. */
export async function contenedorDe(
  origenId: string,
  numero: string,
  embarqueId: string | null = null,
): Promise<string> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('contenedores')
    .select('id')
    .eq('origen_id', origenId)
    .eq('numero', numero)
    .limit(1)
    .returns<{ id: string }[]>()
  exigir(error, 'leer el contenedor')
  const id = data?.[0]?.id
  if (id) {
    exigir(
      (await cliente.from('contenedores').update({ embarque_id: embarqueId }).eq('id', id)).error,
      'poner el contenedor en su embarque',
    )
    return id
  }
  const { data: creado, error: alCrear } = await cliente
    .from('contenedores')
    .insert({ origen_id: origenId, numero, embarque_id: embarqueId })
    .select('id')
    .single<{ id: string }>()
  exigir(alCrear, 'crear el contenedor')
  return creado?.id ?? ''
}

/** El embarque `booking` del origen (lo busca o lo crea) con sus datos. */
export async function embarqueDe(
  origenId: string,
  booking: string,
  datos: DatosDelEmbarque = {},
): Promise<string> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('embarques')
    .select('id')
    .eq('origen_id', origenId)
    .eq('booking', booking)
    .limit(1)
    .returns<{ id: string }[]>()
  exigir(error, 'leer el embarque')
  const id = data?.[0]?.id
  if (id) {
    exigir(
      (await cliente.from('embarques').update(datos).eq('id', id)).error,
      'cambiar el embarque',
    )
    return id
  }
  const { data: creado, error: alCrear } = await cliente
    .from('embarques')
    .insert({ origen_id: origenId, booking, ...datos })
    .select('id')
    .single<{ id: string }>()
  exigir(alCrear, 'crear el embarque')
  return creado?.id ?? ''
}

/**
 * Pone vehículos en un contenedor (con sus datos propios, si el contenedor no va en un embarque) o en un embarque: crea su transporte o corrige el que ya tienen. Lo que no se nombra queda
 * vacío (la fila pasa a ser la de ese contenedor o embarque).
 */
export async function ponerEn(
  vehiculoIds: readonly string[],
  destino: { contenedorId: string } | { embarqueId: string },
  propios: DatosDelEmbarque & { notas?: string | null } = {},
): Promise<void> {
  const filas = vehiculoIds.map((vehiculo_id) => ({
    vehiculo_id,
    contenedor_id: 'contenedorId' in destino ? destino.contenedorId : null,
    embarque_id: 'embarqueId' in destino ? destino.embarqueId : null,
    naviera_id: null,
    puerto_origen_id: null,
    puerto_destino_id: null,
    zarpe_el: null,
    eta_el: null,
    arribo_el: null,
    ...propios,
  }))
  exigir(
    (await admin().from('transportes').upsert(filas, { onConflict: 'vehiculo_id' })).error,
    'poner las unidades en su transporte',
  )
}

/** Quita los contenedores y embarques de estos orígenes (sus transportes ya no están: la FK es `restrict`). */
export async function borrarEmbarquesDe(origenIds: readonly string[]): Promise<void> {
  if (origenIds.length === 0) return
  const cliente = admin()
  exigir(
    (
      await cliente
        .from('contenedores')
        .delete()
        .in('origen_id', [...origenIds])
    ).error,
    'borrar los contenedores de prueba',
  )
  exigir(
    (
      await cliente
        .from('embarques')
        .delete()
        .in('origen_id', [...origenIds])
    ).error,
    'borrar los embarques de prueba',
  )
}

/** El embarque `booking` del origen como quedó en la base (nulo si no existe). */
export async function embarqueDeLaBase(
  origenId: string,
  booking: string,
): Promise<{ id: string; eta_el: string | null; naviera_id: string | null } | null> {
  const { data, error } = await admin()
    .from('embarques')
    .select('id, eta_el, naviera_id')
    .eq('origen_id', origenId)
    .eq('booking', booking)
    .limit(1)
    .returns<{ id: string; eta_el: string | null; naviera_id: string | null }[]>()
  exigir(error, 'leer el embarque')
  return data?.[0] ?? null
}
