import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { capturar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El flujo de un origen como diagrama (T38, `docs/UX.md` › «Flujos: configuración (estados propios)»): las fases como cajas y las salidas como flechas,
// el panel de una fase con sus bloques a la vista, ordenar con el teclado, arrastrar una caja sin cambiar el orden, el aviso de «Revisar» sobre su fase y, en el celular (y con
// «Ver como lista»), la lista con el mismo panel. Todo se siembra por SQL: A (inicial) → B y → C, C (final) → A; B sin salida da el aviso `sin_salida`.
test.describe.configure({ mode: 'serial' })

const P = 'E2E T38'
const A = `${P} A`
const B = `${P} B`
const C = `${P} C`
const SECCIONES = ['Requisitos para entrar', 'Salidas y quién mueve', 'Reglas que la afectan']

let duena = ''
let origen = { id: '', nombre: '' }
const fases: Record<string, string> = {}

function sembrar(): void {
  const flujo = sql(`select id from public.flujos where origen_id = ${literal(origen.id)}::uuid`)
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
    [A, B],
    [A, C],
    [C, A],
  ] as const) {
    sql(
      `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id)
       values (${literal(flujo)}::uuid, ${literal(fases[de] ?? '')}::uuid, ${literal(fases[a] ?? '')}::uuid)`,
    )
  }
}

// Los nombres de las fases del origen en el orden de la base.
const ordenEnLaBase = () =>
  sql(
    `select string_agg(f.nombre, '|' order by f.orden, f.nombre) from public.fases f
       join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = ${literal(origen.id)}::uuid`,
  ).split('|')

// La posición x guardada de una fase (rem), o nula.
const posicionDe = (nombre: string) => {
  const x = sql(
    `select coalesce(posicion_x::text, '') from public.fases where id = ${literal(fases[nombre] ?? '')}::uuid`,
  )
  return x === '' ? null : Number(x)
}

const diagrama = (page: Page) => page.getByRole('region', { name: 'Diagrama del flujo' })
const caja = (page: Page, nombre: string) =>
  diagrama(page).getByRole('button', { name: `Fase «${nombre}»`, exact: true })

async function abrirConElDiagrama(page: Page) {
  await page.goto(`/configuracion/origenes/${origen.id}/fases`)
  await expect(caja(page, A)).toBeVisible()
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(`${P} Origen`, 'e2e_flujo_diagrama')
  sembrar()
  duena = correoDePrueba(`duena-diagrama-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dina Diagrama' })
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// @sin-celular: arrastrar una caja con el mouse es de escritorio; en el celular el diagrama no se mueve, y la lista la prueba la otra prueba
test('E2E T38 el diagrama dibuja fases y salidas, abre el panel de una fase, guarda, ordena con el teclado y mueve una caja sin cambiar el orden', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirConElDiagrama(page)

  // Tres cajas y tres flechas; la fase sin salida lleva el aviso de «Revisar» en su descripción.
  await expect(diagrama(page).getByRole('button', { name: /^Fase «/ })).toHaveCount(3)
  await expect(diagrama(page).locator('[data-salida-id]')).toHaveCount(3)
  await expect(caja(page, B)).toHaveAccessibleDescription(/1 aviso de Revisar/)
  await capturar(page, info, 'diagrama')

  // El panel de A abre en «Reglas», con sus tres bloques a la vista, sin acordeones; la descripción (pestaña «Identidad») se guarda por la RPC.
  await caja(page, A).click()
  await expect(page).toHaveURL(new RegExp(`fase=${fases[A] ?? ''}`))
  const panel = page.getByRole('dialog', { name: A })
  for (const seccion of SECCIONES) {
    await expect(panel.getByRole('heading', { name: seccion, level: 3 })).toBeVisible()
  }
  await expect(panel.locator('details')).toHaveCount(0)
  await panel.getByRole('tab', { name: 'Identidad' }).click()
  await panel.getByLabel('Descripción', { exact: true }).fill('Donde empieza todo')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect
    .poll(() =>
      sql(`select descripcion from public.fases where id = ${literal(fases[A] ?? '')}::uuid`),
    )
    .toBe('Donde empieza todo')
  await capturar(page, info, 'panel-de-la-fase')

  // «Mover después» desde el «⋯» del panel, con el teclado: A pasa detrás de B y el foco sigue en el «⋯». Antes, la versión nueva del flujo (la que dejó «Guardar»).
  // La pestaña va en la URL: recargar la deja donde estaba.
  await page.reload()
  await expect(panel.getByRole('tab', { name: 'Identidad', selected: true })).toBeVisible()
  const mas = panel.getByRole('button', { name: `Más acciones de ${A}`, exact: true })
  await mas.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Mover después', exact: true }).click()
  await expect.poll(ordenEnLaBase).toEqual([B, A, C])
  await expect(mas).toBeFocused()

  // Arrastrar C hasta el borde izquierdo la mueve sin cambiar el orden: la base guarda su posición (a la izquierda de B, ahora la primera) y nada más.
  // Con el panel cerrado y la vista de entrada, que con tres fases las muestra todas sin animar.
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await abrirConElDiagrama(page)
  await caja(page, C).hover()
  await page.mouse.down()
  // Al borde izquierdo de la ventana, en pasos (no hace falta medir dónde está B).
  await page.mouse.move(8, 400, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => posicionDe(C)).not.toBeNull()
  expect((posicionDe(C) ?? 0) < (posicionDe(B) ?? 0)).toBe(true)
  expect(ordenEnLaBase()).toEqual([B, A, C])
  await expect(page.getByRole('dialog')).toBeHidden()
  await capturar(page, info, 'tras-arrastrar')

  // `?fase=` abre su panel, también tras recargar.
  await page.goto(`/configuracion/origenes/${origen.id}/fases?fase=${fases[B] ?? ''}`)
  await page.reload()
  await expect(page.getByRole('dialog', { name: B })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()

  // «Ver como lista» y de vuelta.
  await page.getByRole('button', { name: 'Ver como lista' }).click()
  await expect(page.locator('[data-abre-resumen]')).toHaveText([B, A, C])
  await expect(diagrama(page)).toHaveCount(0)
  await capturar(page, info, 'lista')
  await page.getByRole('button', { name: 'Ver como diagrama' }).click()
  await expect(caja(page, A)).toBeVisible()
})

test('E2E T38 la lista abre el mismo panel y no ensancha la página con el texto al 200 %', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/fases?vista=lista`)
  const nombres = page.locator('[data-abre-resumen]')
  await expect(nombres.filter({ hasText: A })).toBeVisible()
  await expect(diagrama(page)).toHaveCount(0)

  await nombres.filter({ hasText: A }).click()
  const panel = page.getByRole('dialog', { name: A })
  for (const seccion of SECCIONES) {
    await expect(panel.getByRole('heading', { name: seccion, level: 3 })).toBeVisible()
  }
  await capturar(page, info, 'panel-desde-la-lista')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  await textoGrandeAlCargar(page)
  await page.reload()
  await expect(nombres.filter({ hasText: A })).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'lista-al-200')
  await nombres.filter({ hasText: A }).click()
  await expect(
    panel.getByRole('heading', { name: 'Requisitos para entrar', level: 3 }),
  ).toBeVisible()
  await capturar(page, info, 'panel-al-200')
})
