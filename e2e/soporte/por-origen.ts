// El terreno del e2e de Logística por origen (T571): tres orígenes `e2e_…` con la logística encendida y una persona con `logistica.ver`, `vehiculos.ver` y
// `flujos.configurar` en dos de ellos, no en el tercero.
//   A: manual (sin la regla `aduana`), una fase con demora de un día y un vehículo ahí desde hace 3 días: demorado.
//   B: de subasta (el flujo nace con `aduana`), lo mismo con su propio demorado.
//   C: el origen vecino, sin permisos de la persona.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { idDe } from './leads'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Origen = { id: string; nombre: string; clave: string }
type Unidad = { id: string; titulo: string }

export type TerrenoPorOrigen = {
  a: Origen & { fase: string; demorado: Unidad }
  b: Origen & { fase: string; demorado: Unidad }
  c: Origen
  persona: string
}

const DIA = 86_400_000
const CLAVE_DEL_ULTIMO_ORIGEN = 'logistica.ultimo_origen'

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

const claveDe = (letra: string, proyecto: string) => `por_origen_${letra}_${proyecto}`

async function crearFaseConDemorado(
  origenId: string,
  nombre: string,
  titulo: string,
): Promise<{ fase: string; demorado: Unidad }> {
  const cliente = admin()
  const { data: flujo, error: errorDeFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDeFlujo, 'leer el flujo del origen')
  const { data: fase, error: errorDeFase } = await cliente
    .from('fases')
    .insert({ flujo_id: flujo?.id ?? '', nombre, orden: 1, es_inicial: true, demora_dias: 1 })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDeFase, 'crear la fase')
  const { data: vehiculo, error: errorDeVehiculo } = await cliente
    .from('vehiculos')
    .insert({
      origen_id: origenId,
      titulo,
      fase_id: fase?.id ?? '',
      fase_desde: new Date(Date.now() - 3 * DIA).toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDeVehiculo, 'cargar el vehículo')
  return { fase: fase?.id ?? '', demorado: { id: vehiculo?.id ?? '', titulo } }
}

export async function sembrarPorOrigen(proyecto: string): Promise<TerrenoPorOrigen> {
  const origen = async (letra: string, tipo: 'subasta' | 'manual'): Promise<Origen> => {
    const clave = claveDe(letra, proyecto)
    const creado = await crearOrigenDePrueba(
      `E2E Por origen ${letra.toUpperCase()} ${proyecto}`,
      clave,
      {
        tipo,
      },
    )
    return { ...creado, clave }
  }
  const a = await origen('a', 'manual')
  const b = await origen('b', 'subasta')
  const c = await origen('c', 'manual')
  const deA = await crearFaseConDemorado(
    a.id,
    `Puerto A ${proyecto}`,
    `E2E Por origen demorado A ${proyecto}`,
  )
  const deB = await crearFaseConDemorado(
    b.id,
    `Puerto B ${proyecto}`,
    `E2E Por origen demorado B ${proyecto}`,
  )
  const persona = correoDePrueba(`por-origen-${proyecto}`)
  await crearPersona({
    email: persona,
    contrasena: CONTRASENA,
    nombre: 'Persona por origen',
    invitada: true,
  })
  await darRolDePrueba({
    email: persona,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}por origen ${proyecto}`,
      clave: `e2e_por_origen_${proyecto}`,
    },
    permisos: [a.id, b.id].flatMap((origenId) =>
      ['logistica.ver', 'vehiculos.ver', 'flujos.configurar'].map((clave) => ({ clave, origenId })),
    ),
  })
  return { a: { ...a, ...deA }, b: { ...b, ...deB }, c, persona }
}

// El «Último origen» guardado de la persona (nulo = nunca eligió).
export async function ultimoOrigenDe(email: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', await idDe(email))
    .eq('clave', CLAVE_DEL_ULTIMO_ORIGEN)
    .maybeSingle<{ valor: string }>()
  exigir(error, `leer el último origen de ${email}`)
  return data?.valor ?? null
}

export async function borrarPorOrigen(proyecto: string): Promise<void> {
  const claves = ['a', 'b', 'c'].map((letra) => `${PREFIJO_CLAVE_E2E}${claveDe(letra, proyecto)}`)
  await borrarVehiculosDe(claves)
  await borrarOrigenes(claves)
}
