import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// Los catálogos de logística propios de un origen o compartidos con todos (T567): un puerto propio de A con el nombre de uno compartido (otras mayúsculas) lo tapa en A y no en B; lo que A
// guardó antes con el compartido se sigue viendo, rotulado «(tapado)», sin vaciar el campo; y una categoría de gasto propia de A no se ofrece en una unidad de B. Dos orígenes con su fase, la
// regla de transporte y la de gastos encendidas, un vehículo cada uno (y otro en A con el transporte ya guardado), y una persona que edita transporte y gastos en los dos: todo por la API de
// administración, con nombres que llevan el proyecto, y quitado al final.
test.describe.configure({ mode: 'serial' })

type Terreno = {
  a: string
  b: string
  tapadoEnA: string
  compartido: string
  propio: string
  categoriaDeA: string
  persona: string
}

let proyecto = ''
let terreno: Terreno

const claveDeOrigen = (letra: 'a' | 'b') => `catalogos_${letra}_${proyecto}`
const nombreDelCompartido = () => `E2E Arica ${proyecto}`
const nombreDelPropio = () => `e2e  ARICA ${proyecto}`
const nombreDeLaCategoria = () => `E2E Categoría de A ${proyecto}`

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

// Un origen con su fase inicial, las reglas de transporte y gastos encendidas y los vehículos pedidos en esa fase.
async function sembrarOrigen(letra: 'a' | 'b', titulos: string[]) {
  const cliente = admin()
  const origen = await crearOrigenDePrueba(
    `E2E Catálogos ${letra.toUpperCase()} ${proyecto}`,
    claveDeOrigen(letra),
  )
  const { data: flujo, error: errorDelFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen.id)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDelFlujo, 'leer el flujo del origen')
  const flujoId = flujo?.id ?? ''
  const { error: errorDeReglas } = await cliente.from('flujos_reglas').upsert(
    ['transporte', 'gastos'].map((regla) => ({ flujo_id: flujoId, regla, activa: true })),
    { onConflict: 'flujo_id,regla' },
  )
  exigir(errorDeReglas, 'encender las reglas')
  const { data: fase, error: errorDeFase } = await cliente
    .from('fases')
    .insert({ flujo_id: flujoId, nombre: `Puerto ${proyecto}`, orden: 1, es_inicial: true })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDeFase, 'crear la fase')
  const { data: vehiculos, error: errorDeVehiculos } = await cliente
    .from('vehiculos')
    .insert(titulos.map((titulo) => ({ origen_id: origen.id, titulo, fase_id: fase?.id })))
    .select('id, titulo')
    .returns<{ id: string; titulo: string }[]>()
  exigir(errorDeVehiculos, 'cargar los vehículos')
  const ids = new Map((vehiculos ?? []).map((v) => [v.titulo, v.id]))
  return { origenId: origen.id, ids }
}

async function insertar(tabla: string, fila: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin()
    .from(tabla)
    .insert(fila)
    .select('id')
    .single<{ id: string }>()
  exigir(error, `crear la fila de ${tabla}`)
  return data?.id ?? ''
}

async function sembrar(): Promise<Terreno> {
  const tituloA = `E2E Unidad de A ${proyecto}`
  const tituloTapado = `E2E Unidad de A con transporte ${proyecto}`
  const tituloB = `E2E Unidad de B ${proyecto}`
  const a = await sembrarOrigen('a', [tituloA, tituloTapado])
  const b = await sembrarOrigen('b', [tituloB])
  const compartido = await insertar('puertos', { nombre: nombreDelCompartido() })
  const tapadoEnA = a.ids.get(tituloTapado) ?? ''
  // Lo que A guardó con el compartido antes de tener su propio.
  await insertar('transportes', { vehiculo_id: tapadoEnA, puerto_origen_id: compartido })
  const propio = await insertar('puertos', { nombre: nombreDelPropio(), origen_id: a.origenId })
  const categoriaDeA = await insertar('categorias_gasto', {
    nombre: nombreDeLaCategoria(),
    origen_id: a.origenId,
  })
  const persona = correoDePrueba(`catalogos-por-origen-${proyecto}`)
  await crearPersona({
    email: persona,
    contrasena: CONTRASENA,
    nombre: 'Persona de los dos',
    invitada: true,
  })
  await darRolDePrueba({
    email: persona,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}catálogos por origen ${proyecto}`,
      clave: `e2e_catalogos_por_origen_${proyecto}`,
    },
    permisos: [a.origenId, b.origenId].flatMap((origenId) =>
      [
        'logistica.ver',
        'vehiculos.ver',
        'logistica.transporte.editar',
        'logistica.gastos.ver',
        'logistica.gastos.editar',
      ].map((clave) => ({ clave, origenId })),
    ),
  })
  return {
    a: a.ids.get(tituloA) ?? '',
    b: b.ids.get(tituloB) ?? '',
    tapadoEnA,
    compartido,
    propio,
    categoriaDeA,
    persona,
  }
}

// Quita lo sembrado: transportes y vehículos de los dos orígenes, los orígenes (sus propios se van en cascada) y el puerto compartido.
async function borrar(): Promise<void> {
  const cliente = admin()
  const claves = (['a', 'b'] as const).map((l) => `${PREFIJO_CLAVE_E2E}${claveDeOrigen(l)}`)
  const { data: origenes } = await cliente
    .from('origenes')
    .select('id')
    .in('clave', claves)
    .limit(2)
    .returns<{ id: string }[]>()
  const ids = (origenes ?? []).map((o) => o.id)
  if (ids.length > 0) {
    const { data: vehiculos } = await cliente
      .from('vehiculos')
      .select('id')
      .in('origen_id', ids)
      .limit(10)
      .returns<{ id: string }[]>()
    const deVehiculos = (vehiculos ?? []).map((v) => v.id)
    if (deVehiculos.length > 0) {
      exigir(
        (await cliente.from('transportes').delete().in('vehiculo_id', deVehiculos)).error,
        'borrar los transportes',
      )
      exigir(
        (await cliente.from('vehiculos').delete().in('id', deVehiculos)).error,
        'borrar los vehículos',
      )
    }
    exigir((await cliente.from('origenes').delete().in('id', ids)).error, 'borrar los orígenes')
  }
  exigir(
    (
      await cliente
        .from('puertos')
        .delete()
        .is('origen_id', null)
        .eq('nombre', nombreDelCompartido())
    ).error,
    'borrar el puerto compartido',
  )
}

async function abrirElTransporte(page: Page, vehiculoId: string): Promise<Locator> {
  await page.goto(`/logistica/vehiculo/${vehiculoId}`)
  await abrirSeccionDeLaUnidad(page, 'transporte')
  return page.locator('[data-hueco="transporte"]')
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-catalogos-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Catálogos',
  })
  terreno = await sembrar()
})

test.afterAll(async () => {
  await borrar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E el puerto de origen ofrece en A su propio y en B el compartido, sin saltar al llegar las opciones', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })

  const enA = await abrirElTransporte(page, terreno.a)
  const puertoEnA = enA.getByLabel('Puerto de origen')
  await expect(puertoEnA).toBeVisible()
  const antes = await puertoEnA.boundingBox()
  // Las opciones están y los permisos llegaron (el campo se enciende): recién ahí se vuelve a medir.
  await expect(puertoEnA.locator(`option[value="${terreno.propio}"]`)).toHaveCount(1)
  await expect(puertoEnA).toBeEnabled()
  await expect(puertoEnA.locator(`option[value="${terreno.compartido}"]`)).toHaveCount(0)
  const despues = await puertoEnA.boundingBox()
  expect(despues?.height).toBe(antes?.height)
  expect(despues?.y).toBe(antes?.y)

  const enB = await abrirElTransporte(page, terreno.b)
  const puertoEnB = enB.getByLabel('Puerto de origen')
  await expect(puertoEnB.locator(`option[value="${terreno.compartido}"]`)).toHaveCount(1)
  await expect(puertoEnB.locator(`option[value="${terreno.propio}"]`)).toHaveCount(0)
})

test('E2E lo que A guardó con el compartido que ahora tapa se ve «(tapado)» y el campo no se vacía', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  const hueco = await abrirElTransporte(page, terreno.tapadoEnA)
  const puerto = hueco.getByLabel('Puerto de origen')
  await expect(puerto).toHaveValue(terreno.compartido)
  await expect(puerto.locator(`option[value="${terreno.compartido}"]`)).toHaveText(
    `${nombreDelCompartido()} (tapado)`,
  )
  // El propio de A es el que se ofrece para elegir de nuevo.
  await expect(puerto.locator(`option[value="${terreno.propio}"]`)).toHaveCount(1)
})

test('E2E una categoría de gasto propia de A no se ofrece al registrar un gasto en una unidad de B', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  for (const [vehiculoId, cuantas] of [
    [terreno.a, 1],
    [terreno.b, 0],
  ] as const) {
    await page.goto(`/logistica/vehiculo/${vehiculoId}`)
    await abrirSeccionDeLaUnidad(page, 'gastos')
    await page.getByRole('button', { name: 'Registrar gasto' }).click()
    const formulario = page.getByRole('dialog', { name: 'Registrar gasto' })
    const categoria = formulario.getByLabel('Categoría')
    // Llegaron las opciones: la compartida de siempre está.
    await expect(categoria.getByRole('option', { name: 'Flete marítimo' })).toHaveCount(1)
    await expect(categoria.locator(`option[value="${terreno.categoriaDeA}"]`)).toHaveCount(cuantas)
    await page.keyboard.press('Escape')
    await expect(formulario).toBeHidden()
  }
})
