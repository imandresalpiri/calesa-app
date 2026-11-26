// @sin-celular-archivo: arrastrar y vincular con el mouse son de escritorio; Configuración no se prueba en el celular (decisión de la persona)
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Editar el flujo sobre su diagrama (`docs/UX.md` › «Flujos: configuración (estados propios)»): arrastrar una fase la deja donde se soltó sin cambiar el
// orden (también con el teclado), el doble clic en el vacío crea una fase ahí, el asa de una fase vincula arrastrando, una flecha abre su salida y se quita
// con Supr, y «Ordenar solo» vuelve al acomodo con Ctrl+Z para deshacer. Quien no configura el flujo no abre la pestaña (la base rechaza la posición: lo
// prueba `supabase/tests/areas/flujos/fases-posiciones.sql`). Se siembra por SQL: A (inicial) → C, B → C, C (final).
test.describe.configure({ mode: 'serial' })

const P = 'E2E T569'
const A = `${P} A`
const B = `${P} B`
const C = `${P} C`
const D = `${P} D`

let duena = ''
let ajena = ''
let origen = { id: '', nombre: '' }
let flujo = ''
const fases: Record<string, string> = {}

function sembrar(): void {
  flujo = sql(`select id from public.flujos where origen_id = ${literal(origen.id)}::uuid`)
  const filas = [
    [A, 10, true, false],
    [B, 20, false, false],
    [C, 30, false, true],
  ] as const
  for (const [nombre, orden, inicial, final] of filas) {
    fases[nombre] = sql(
      `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final)
       values (${literal(flujo)}::uuid, ${literal(nombre)}, ${String(orden)}, ${String(inicial)}, ${String(final)}) returning id`,
    )
  }
  for (const [de, a] of [
    [A, C],
    [B, C],
  ] as const) {
    sql(
      `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id)
       values (${literal(flujo)}::uuid, ${literal(fases[de] ?? '')}::uuid, ${literal(fases[a] ?? '')}::uuid)`,
    )
  }
}

const posicionEnLaBase = (nombre: string) => {
  const [x, y] = sql(
    `select coalesce(posicion_x::text, '') || '|' || coalesce(posicion_y::text, '') from public.fases
      where flujo_id = ${literal(flujo)}::uuid and nombre = ${literal(nombre)}`,
  ).split('|')
  return x && y ? { x: Number(x), y: Number(y) } : null
}

const ordenEnLaBase = () =>
  sql(
    `select string_agg(nombre, '|' order by orden, nombre) from public.fases where flujo_id = ${literal(flujo)}::uuid`,
  ).split('|')

const salidasEnLaBase = () =>
  Number(
    sql(`select count(*) from public.fases_transiciones where flujo_id = ${literal(flujo)}::uuid`),
  )

const diagrama = (page: Page) => page.getByRole('region', { name: 'Diagrama del flujo' })
const caja = (page: Page, nombre: string) =>
  diagrama(page).getByRole('button', { name: `Fase «${nombre}»`, exact: true })
const asa = (page: Page, nombre: string) =>
  diagrama(page).getByLabel(`Crear una salida desde «${nombre}»`, { exact: true })
const flechas = (page: Page) => diagrama(page).locator('[data-salida-id]')

async function abrirElDiagrama(page: Page) {
  await page.goto(`/configuracion/origenes/${origen.id}/fases`)
  await expect(caja(page, A)).toBeVisible()
}

// Un arrastre con el mouse, en dos movimientos: de una cosa a otra (o a un punto del fondo), sin medir nada (`force`: con una conexión en curso el destino de la caja la
// cubre).
async function arrastrar(
  page: Page,
  desde: Locator,
  hasta: Locator,
  en?: { x: number; y: number },
) {
  await desde.hover()
  await page.mouse.down()
  // Un primer movimiento corto arranca el arrastre (React Flow no mueve con el primero); el segundo lo lleva al destino.
  await desde.hover({ force: true, position: { x: 4, y: 4 } })
  await hasta.hover({ force: true, ...(en ? { position: en } : {}) })
  await page.mouse.up()
}

// Un punto vacío del fondo: con la vista alejada el dibujo queda en el medio, y el borde izquierdo, debajo de la barra flotante, queda libre.
const fondo = (page: Page) => diagrama(page).locator('.react-flow__pane')
const VACIO = { x: 12, y: 220 }
async function alejar(page: Page) {
  await diagrama(page).getByRole('button', { name: 'Ver todo el flujo' }).click()
  await diagrama(page).getByRole('button', { name: 'Alejar' }).click()
  await diagrama(page).getByRole('button', { name: 'Alejar' }).click()
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(`${P} Origen`, 'e2e_flujo_editable')
  sembrar()
  duena = correoDePrueba(`duena-editable-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Elsa Editable' })
  ajena = correoDePrueba(`ajena-editable-${info.project.name}`)
  await crearPersona({ email: ajena, contrasena: CONTRASENA, nombre: 'Aída Ajena', invitada: true })
  await darRolDePrueba({
    email: ajena,
    rol: { nombre: `${PREFIJO_ROL_E2E}Ajena editable`, clave: 'e2e_ajena_editable' },
    permisos: [{ clave: 'cotizaciones.configurar', origenId: origen.id }],
  })
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: mover una fase arrastrándola y con el teclado la deja ahí, sin cambiar el orden', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiagrama(page)
  await capturar(page, info, 'antes-de-mover')

  // Arrastrar B hasta el borde izquierdo: queda ahí (a la izquierda de A, la primera) y el orden no cambia.
  await alejar(page)
  await arrastrar(page, caja(page, B), fondo(page), VACIO)
  await expect.poll(() => posicionEnLaBase(B)).not.toBeNull()
  const a = posicionEnLaBase(A)
  const b = posicionEnLaBase(B)
  expect((b?.x ?? 0) < (a?.x ?? 0)).toBe(true)
  expect(ordenEnLaBase()).toEqual([A, B, C])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await capturar(page, info, 'tras-arrastrar')

  // Al recargar, sigue ahí.
  await abrirElDiagrama(page)
  await expect(caja(page, B)).toBeVisible()
  expect(posicionEnLaBase(B)).toEqual(b)

  // Con el teclado: dos flechas a la derecha (1 rem cada una) y Shift+abajo (10 rem) se guardan juntas.
  const antes = posicionEnLaBase(B)
  if (!antes) throw new Error('B no tiene posición.')
  await caja(page, B).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => posicionEnLaBase(B)).toEqual({ x: antes.x + 2, y: antes.y + 10 })
  await expect(caja(page, B)).toBeFocused()
  await abrirElDiagrama(page)
  expect(posicionEnLaBase(B)).toEqual({ x: antes.x + 2, y: antes.y + 10 })
})

test('E2E escritorio: doble clic en el vacío crea una fase ahí y abre su panel', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiagrama(page)
  await alejar(page)
  await fondo(page).dblclick({ position: VACIO })
  const modal = page.getByRole('dialog', { name: 'Nueva fase' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/panel=nueva-fase&en=/)
  await expect(modal.getByText('Se agrega al final del flujo.')).toBeVisible()
  await modal.getByLabel('Nombre').fill(D)
  await modal.getByLabel('Intermedia', { exact: false }).check()
  await modal.getByRole('button', { name: 'Crear fase' }).click()

  await expect(page.getByRole('dialog', { name: D })).toBeVisible()
  await expect(caja(page, D)).toBeVisible()
  expect(posicionEnLaBase(D)).not.toBeNull()
  expect(ordenEnLaBase().at(-1)).toBe(D)
  await capturar(page, info, 'fase-creada-con-doble-clic')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('E2E escritorio: vincular arrastrando el asa, y los dos casos que no crean nada', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiagrama(page)
  await expect(flechas(page)).toHaveCount(2)

  // Del asa de A a la caja de B: nace la salida y se abre el panel de A con ella en edición.
  await arrastrar(page, asa(page, A), caja(page, B))
  await expect(
    diagrama(page).getByRole('button', { name: `Salida de «${A}» a «${B}»` }),
  ).toBeVisible()
  await expect(flechas(page)).toHaveCount(3)
  expect(salidasEnLaBase()).toBe(3)
  const panel = page.getByRole('dialog', { name: A })
  await expect(panel.getByRole('form', { name: 'Editar salida' })).toBeVisible()
  await expect(page).toHaveURL(/editar=salida/)
  await capturar(page, info, 'salida-creada')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  // Soltar en el vacío no crea nada.
  await alejar(page)
  await arrastrar(page, asa(page, B), fondo(page), VACIO)
  await expect(flechas(page)).toHaveCount(3)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // A consigo misma: el motivo aparece junto al punto, y no se crea nada.
  await arrastrar(page, asa(page, A), caja(page, A))
  await expect(page.getByText('Una transición no puede volver a la misma fase.')).toBeVisible()
  await capturar(page, info, 'motivo-al-soltar')
  expect(salidasEnLaBase()).toBe(3)
})

test('E2E escritorio: tocar una flecha abre su salida; con Supr se quita tras confirmar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiagrama(page)
  // La de A a C: la de B a C puede quedar debajo de la fase que creó el doble clic.
  const etiqueta = diagrama(page).getByRole('button', { name: `Salida de «${A}» a «${C}»` })
  await etiqueta.click()
  await expect(page).toHaveURL(/editar=salida/)
  await expect(
    page.getByRole('dialog', { name: A }).getByRole('form', { name: 'Editar salida' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  await etiqueta.focus()
  await page.keyboard.press('Delete')
  const confirmar = page.getByRole('dialog', { name: /^Quitar la salida/ })
  await expect(confirmar).toBeVisible()
  await expect(page).toHaveURL(/eliminar=salida/)
  await confirmar.getByRole('button', { name: 'Quitar salida' }).click()
  await expect(etiqueta).toHaveCount(0)
  await expect.poll(salidasEnLaBase).toBe(2)
})

test('E2E escritorio: «Ordenar solo» vuelve al acomodo y Ctrl+Z lo deshace', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiagrama(page)
  const movida = posicionEnLaBase(B)
  if (!movida) throw new Error('B no tiene posición.')

  await diagrama(page).getByRole('button', { name: 'Ordenar solo' }).click()
  await expect(page.getByText('Fases reacomodadas')).toBeVisible()
  await expect.poll(() => posicionEnLaBase(B)).not.toEqual(movida)
  await capturar(page, info, 'ordenado-solo')

  await caja(page, A).focus()
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => posicionEnLaBase(B)).toEqual(movida)
  await abrirElDiagrama(page)
  expect(posicionEnLaBase(B)).toEqual(movida)
})

test('E2E escritorio: quien no configura el flujo no abre la pestaña', async ({ page }) => {
  await entrar(page, ajena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/fases`)
  await expect(page.getByText('No puedes abrir esta pestaña')).toBeVisible()
  await expect(diagrama(page)).toHaveCount(0)
})
