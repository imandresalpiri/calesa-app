// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El panel de una fase en tres pestañas (T518, `docs/UX.md` › «Flujos: configuración (estados propios)»): abre en «Reglas»; `&pestana=` por la URL (reemplaza el
// historial); lo escrito sobrevive al cambiar de pestaña; un error en la pestaña que no se ve la marca y la lleva con el foco; el «⋯» con Mover antes, Mover
// después y Jubilar o eliminar; y lo mismo en el flujo de repuestos. Todo se siembra por SQL.
test.describe.configure({ mode: 'serial' })

const P = 'E2E T518'
const A = `${P} A`
const B = `${P} B`
const fases: Record<string, string> = {}
let duena = ''
let origen = { id: '', nombre: '' }

function sembrar(): void {
  const flujo = sql(`select id from public.flujos where origen_id = ${literal(origen.id)}::uuid`)
  for (const [nombre, orden, inicial, final] of [
    [A, 10, true, false],
    [B, 20, false, true],
  ] as const) {
    fases[nombre] = sql(
      `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final)
       values (${literal(flujo)}::uuid, ${literal(nombre)}, ${String(orden)}, ${String(inicial)}, ${String(final)}) returning id`,
    )
  }
}

const ordenEnLaBase = () =>
  sql(
    `select string_agg(f.nombre, '|' order by f.orden, f.nombre) from public.fases f
       join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = ${literal(origen.id)}::uuid`,
  ).split('|')

const urlDe = (faseId: string, resto = '') =>
  `/configuracion/origenes/${origen.id}/fases?vista=lista&fase=${faseId}${resto}`
const panelDe = (page: Page, nombre: string) => page.getByRole('dialog', { name: nombre })
const pestana = (panel: ReturnType<typeof panelDe>, nombre: string | RegExp, selected?: boolean) =>
  panel.getByRole('tab', { name: nombre, ...(selected === undefined ? {} : { selected }) })

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(`${P} Origen`, 'e2e_fase_pestanas')
  sembrar()
  duena = correoDePrueba(`duena-pestanas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Pestañas' })
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E T518 el panel abre en Reglas, la pestaña vive en la URL y no suma historial', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/fases?vista=lista`)
  await page.locator('[data-abre-resumen]').filter({ hasText: A }).click()
  const panel = panelDe(page, A)
  await expect(pestana(panel, 'Reglas', true)).toBeVisible()
  await expect(panel.getByRole('tab')).toHaveText(['Reglas', 'Identidad', 'Ajustes'])
  for (const bloque of [
    'Requisitos para entrar',
    'Salidas y quién mueve',
    'Reglas que la afectan',
  ]) {
    await expect(panel.getByRole('heading', { name: bloque, level: 3 })).toBeVisible()
  }
  await expect(panel.getByLabel('Nombre', { exact: true })).toBeHidden()
  await capturar(page, info, 'reglas')

  // Cambiar de pestaña reemplaza la entrada: «atrás» cierra el panel en lugar de volver a «Reglas».
  await pestana(panel, 'Identidad').click()
  await expect(page).toHaveURL(/pestana=identidad/)
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(A)
  await capturar(page, info, 'identidad')
  await pestana(panel, 'Ajustes').click()
  await expect(page).toHaveURL(/pestana=ajustes/)
  await expect(panel.getByRole('heading', { name: 'Transporte y aduana', level: 3 })).toBeVisible()
  await capturar(page, info, 'ajustes')
  await page.goBack()
  await expect(panel).toBeHidden()
  await expect(page).not.toHaveURL(/fase=/)

  // `&pestana=` por la URL; un valor desconocido es «Reglas»; abrir otra fase vuelve a «Reglas».
  await page.goto(urlDe(fases[A] ?? '', '&pestana=ajustes'))
  await expect(pestana(panelDe(page, A), 'Ajustes', true)).toBeVisible()
  await page.goto(urlDe(fases[A] ?? '', '&pestana=datos'))
  await expect(pestana(panelDe(page, A), 'Reglas', true)).toBeVisible()
  await page.goto(urlDe(fases[A] ?? '', '&pestana=identidad'))
  await expect(panel.getByLabel('Nombre', { exact: true })).toBeVisible()
  await page.locator('[data-abre-resumen]').filter({ hasText: B }).click()
  await expect(pestana(panelDe(page, B), 'Reglas', true)).toBeVisible()
  await expect(page).not.toHaveURL(/pestana=/)
})

test('E2E T518 lo escrito sobrevive al cambiar de pestaña, la pestaña lo marca y un error la lleva con el foco', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDe(fases[A] ?? '', '&pestana=identidad'))
  const panel = panelDe(page, A)
  const nombre = panel.getByLabel('Nombre', { exact: true })
  await nombre.fill('')
  await expect(pestana(panel, /^Identidad/)).toHaveAccessibleName(
    'Identidad. con cambios sin guardar',
  )
  await pestana(panel, 'Reglas').click()
  await expect(nombre).toBeHidden()
  await expect(pestana(panel, /^Identidad/)).toHaveAccessibleName(
    'Identidad. con cambios sin guardar',
  )
  await expect(pestana(panel, 'Reglas')).toHaveAccessibleName('Reglas')
  await pestana(panel, /^Identidad/).click()
  await expect(nombre).toHaveValue('')

  // Se guarda desde «Ajustes» con el nombre vacío: el error está en «Identidad», que se marca, se abre y recibe el foco.
  await pestana(panel, 'Ajustes').click()
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(pestana(panel, /^Identidad/, true)).toHaveAccessibleName('Identidad. con errores')
  await expect(nombre).toBeFocused()
  await expect(page).toHaveURL(/pestana=identidad/)
  await capturar(page, info, 'error-en-identidad')

  // Corregido, «Guardar» guarda lo que cambió y no queda ninguna marca.
  await nombre.fill(`${A} editada`)
  await pestana(panel, 'Ajustes').click()
  await panel.getByRole('switch', { name: 'Pide nota al entrar' }).click()
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText(`Fase «${A} editada» guardada.`)).toBeVisible()
  await expect
    .poll(() =>
      sql(
        `select nombre || '|' || nota_obligatoria from public.fases where id = ${literal(fases[A] ?? '')}::uuid`,
      ),
    )
    .toBe(`${A} editada|true`)
  await expect(pestana(panel, /^Identidad/)).toHaveAccessibleName('Identidad')
  await expect(pestana(panel, /^Ajustes/)).toHaveAccessibleName('Ajustes')
  sql(
    `update public.fases set nombre = ${literal(A)}, nota_obligatoria = false where id = ${literal(fases[A] ?? '')}::uuid`,
  )
})

test('E2E T518 el «⋯» del panel mueve y jubila, con su motivo si no se puede', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDe(fases[A] ?? ''))
  const panel = panelDe(page, A)
  const mas = panel.getByRole('button', { name: `Más acciones de ${A}`, exact: true })
  await mas.click()
  const menu = page.getByRole('menu', { name: `Más acciones de ${A}`, exact: true })
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Mover antes',
    'Mover después',
    'Jubilar o eliminar',
  ])
  // La primera no puede ir antes: apagada y con su motivo junto a ella.
  await expect(menu.getByRole('menuitem', { name: 'Mover antes' })).toBeDisabled()
  await expect(menu.getByText('Ya es la primera fase.')).toBeVisible()
  await capturar(page, info, 'menu')
  await menu.getByRole('menuitem', { name: 'Mover después' }).click()
  await expect.poll(ordenEnLaBase).toEqual([B, A])
  await expect(mas).toBeFocused()

  // «Jubilar o eliminar» abre la confirmación, la misma de la lista.
  await mas.click()
  await page.getByRole('menuitem', { name: 'Jubilar o eliminar' }).click()
  await expect(page).toHaveURL(/panel=eliminar-fase/)
  const dialogo = page.getByRole('dialog', { name: new RegExp(`fase «${A}»`) })
  await expect(dialogo).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  sql(
    `update public.fases set orden = case nombre when ${literal(A)} then 10 else 20 end where id in (${literal(fases[A] ?? '')}::uuid, ${literal(fases[B] ?? '')}::uuid)`,
  )
})

test('E2E T518 el flujo de repuestos tiene las mismas pestañas, sin lo que no existe ahí', async ({
  page,
}, info) => {
  const faseDeRepuestos = sql(
    `select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id
       where fl.ambito = 'repuestos' order by f.orden limit 1`,
  )
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/configuracion/flujo?vista=lista&fase=${faseDeRepuestos}`)
  const panel = page.getByRole('dialog')
  await expect(pestana(panel, 'Reglas', true)).toBeVisible()
  await expect(panel.getByRole('tab')).toHaveText(['Reglas', 'Identidad', 'Ajustes'])
  await pestana(panel, 'Ajustes').click()
  await expect(panel.getByText('No existe en el flujo de repuestos.').first()).toBeVisible()
  await capturar(page, info, 'repuestos')
})
