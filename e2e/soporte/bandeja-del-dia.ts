// El terreno de los e2e de la bandeja del día de `/logistica`: un origen de subasta `e2e_…` con «Subasta» (la subasta) → «Comprado» (alerta a 1 día) → «Embarcado» (pide el BL aprobado), y otro vacío.
//   21 vehículos demorados en «Comprado» (3 días) a los que les falta el BL para «Embarcado» (trabados), uno de ellos con un BL subido por aprobar; uno recién llegado a «Comprado» con un transporte
//   con ETA vencida (llegada esperada); y uno con la subasta terminada en «Subasta» (sin resolver).
//   Quien mueve y aprueba ve el origen lleno; quien sólo ve la logística, el vacío (nada pendiente hoy).
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { contenedorDe, ponerEn } from './embarques'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Unidad = { id: string; titulo: string }

export type TerrenoDeLaBandeja = {
  origen: { id: string; nombre: string }
  vacio: { id: string; nombre: string }
  comprado: string
  demoradas: number
  conBl: Unidad
  llegada: Unidad
  sinResolver: Unidad
  quien: { correo: string; nombre: string }
  soloVer: { correo: string; nombre: string }
}

export const DEMORADAS = 21

const DIA = 86_400_000
const claveDe = (proyecto: string, letra: string) => `bandeja_${letra}_${proyecto}`

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

async function origenDeSubasta(proyecto: string, letra: string, nombre: string) {
  const origen = await crearOrigenDePrueba(
    `E2E Bandeja ${nombre} ${proyecto}`,
    claveDe(proyecto, letra),
    {
      tipo: 'subasta',
      plataformas: ['copart'],
    },
  )
  const { data, error } = await admin()
    .from('flujos')
    .select('id')
    .eq('origen_id', origen.id)
    .single<{ id: string }>()
  exigir(error, 'leer el flujo')
  return { origen, flujo: data?.id ?? '' }
}

async function crearFases(flujo: string) {
  const { data, error } = await admin()
    .from('fases')
    .insert([
      {
        flujo_id: flujo,
        nombre: 'Subasta',
        orden: 1,
        es_inicial: true,
        es_subasta: true,
        es_logistica: true,
      },
      {
        flujo_id: flujo,
        nombre: 'Comprado',
        orden: 2,
        es_inicial: false,
        es_subasta: false,
        es_logistica: true,
        demora_dias: 1,
      },
      {
        flujo_id: flujo,
        nombre: 'Embarcado',
        orden: 3,
        es_inicial: false,
        es_subasta: false,
        es_logistica: true,
      },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(error, 'crear las fases')
  const fase = (nombre: string) => data?.find((f) => f.nombre === nombre)?.id ?? ''
  const { subasta, comprado, embarcado } = {
    subasta: fase('Subasta'),
    comprado: fase('Comprado'),
    embarcado: fase('Embarcado'),
  }
  exigir(
    (
      await admin()
        .from('fases_transiciones')
        .insert([
          { flujo_id: flujo, de_fase_id: subasta, a_fase_id: comprado },
          { flujo_id: flujo, de_fase_id: comprado, a_fase_id: embarcado },
        ])
    ).error,
    'crear las salidas',
  )
  return { subasta, comprado, embarcado }
}

async function crearPersonaDeLaBandeja(
  proyecto: string,
  persona: { etiqueta: string; nombre: string; origenId: string; claves: string[] },
) {
  const { etiqueta, nombre, origenId, claves } = persona
  const correo = correoDePrueba(`${etiqueta}-bandeja-${proyecto}`)
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} bandeja ${proyecto}`,
      clave: `e2e_${etiqueta}_bandeja_${proyecto}`,
    },
    permisos: claves.map((clave) => ({ clave, origenId })),
  })
  return { correo, nombre }
}

async function sembrarLosVehiculos({
  origenId,
  subasta,
  comprado,
  tipoId,
  proyecto,
}: {
  origenId: string
  subasta: string
  comprado: string
  tipoId: string
  proyecto: string
}): Promise<Pick<TerrenoDeLaBandeja, 'conBl' | 'llegada' | 'sinResolver'>> {
  const cliente = admin()
  const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString()
  const titulo = (n: number) => `E2E Bandeja demorado ${String(n).padStart(2, '0')} ${proyecto}`
  const titulos = {
    llegada: `E2E Bandeja llegada ${proyecto}`,
    sinResolver: `E2E Bandeja sin resolver ${proyecto}`,
  }
  const filas = [
    ...Array.from({ length: DEMORADAS }, (_, i) => ({
      origen_id: origenId,
      titulo: titulo(i + 1),
      fase_id: comprado,
      // El primero es el más antiguo: va primero en el grupo (por vencimiento).
      fase_desde: hace(10 - i * 0.01),
    })),
    { origen_id: origenId, titulo: titulos.llegada, fase_id: comprado, fase_desde: hace(0) },
    {
      origen_id: origenId,
      titulo: titulos.sinResolver,
      fase_id: subasta,
      fase_desde: hace(2),
      estado_subasta: 'terminada',
      subasta_en: hace(2),
    },
  ]
  const { data, error } = await cliente
    .from('vehiculos')
    .insert(filas)
    .select('id, titulo')
    .returns<Unidad[]>()
  exigir(error, 'cargar los vehículos')
  const id = (t: string) => data?.find((v) => v.titulo === t)?.id ?? ''
  const conBl = { id: id(titulo(1)), titulo: titulo(1) }
  // Nace «subido» (el trigger `documento_sellos`): espera revisión y no cumple el requisito de «Embarcado».
  exigir(
    (
      await cliente.from('documentos').insert({
        vehiculo_id: conBl.id,
        tipo_documento_id: tipoId,
        nombre_archivo: 'bl.pdf',
        mime: 'application/pdf',
      })
    ).error,
    'subir el BL',
  )
  const llegada = { id: id(titulos.llegada), titulo: titulos.llegada }
  const ayer = new Date(Date.now() - 5 * DIA).toISOString().slice(0, 10)
  const contenedorId = await contenedorDe(
    origenId,
    `BAND${proyecto === 'celular' ? '7' : '8'}654321`,
  )
  await ponerEn([llegada.id], { contenedorId }, { eta_el: ayer })
  return {
    conBl,
    llegada,
    sinResolver: { id: id(titulos.sinResolver), titulo: titulos.sinResolver },
  }
}

export async function sembrarBandeja(proyecto: string): Promise<TerrenoDeLaBandeja> {
  const { origen, flujo } = await origenDeSubasta(proyecto, 'a', 'A')
  const { origen: vacio, flujo: flujoVacio } = await origenDeSubasta(proyecto, 'b', 'Vacío')
  await crearFases(flujoVacio)
  const { subasta, comprado, embarcado } = await crearFases(flujo)
  const cliente = admin()
  const { data: tipo, error: errorDelTipo } = await cliente
    .from('tipos_documento')
    .insert({ flujo_id: flujo, nombre: `E2E BL bandeja ${proyecto}`, orden: 1 })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDelTipo, 'crear el tipo de documento')
  exigir(
    (
      await cliente.from('fases_requisitos').insert({
        fase_id: embarcado,
        tipo: 'documento',
        tipo_documento_id: tipo?.id ?? '',
        bloqueante: true,
        orden: 1,
      })
    ).error,
    'crear el requisito',
  )
  const vehiculos = await sembrarLosVehiculos({
    origenId: origen.id,
    subasta,
    comprado,
    tipoId: tipo?.id ?? '',
    proyecto,
  })
  return {
    origen,
    vacio,
    comprado,
    demoradas: DEMORADAS,
    ...vehiculos,
    quien: await crearPersonaDeLaBandeja(proyecto, {
      etiqueta: 'quien',
      nombre: 'Quien Mueve',
      origenId: origen.id,
      claves: ['logistica.ver', 'vehiculos.ver', 'flujos.mover', 'logistica.documentos.aprobar'],
    }),
    soloVer: await crearPersonaDeLaBandeja(proyecto, {
      etiqueta: 'solover',
      nombre: 'Solo Ve',
      origenId: vacio.id,
      claves: ['logistica.ver', 'vehiculos.ver'],
    }),
  }
}

// Quita lo que `sembrarBandeja` creó (los vehículos primero: un origen con vehículos no se borra). Las personas y los roles los limpia el spec.
export async function borrarBandeja(proyecto: string): Promise<void> {
  const claves = ['a', 'b'].map((letra) => `${PREFIJO_CLAVE_E2E}${claveDe(proyecto, letra)}`)
  await borrarVehiculosDe(claves)
  await borrarOrigenes(claves)
}
