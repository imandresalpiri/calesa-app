// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { literal, sql } from './soporte/sql'

// El flujo de un origen sin fases (`docs/UX.md` › «Flujos: configuración (estados propios)»): la dueña lo empieza con las fases de otro origen
// («Empezar con las fases de…») y ve lo que no se copió, o lo empieza en blanco («Empezar en blanco» abre «Nueva fase»). Dos recorridos del camino feliz:
// cada rechazo, el conflicto y el permiso ya los prueba la base (`supabase/tests/areas/flujos/copiar-fases.sql` y sus carreras).
test.describe.configure({ mode: 'serial' })

const P = 'E2E Copia'
const COMPRA = `${P} Compra`
const REMATE = `${P} Remate`
const ENTREGA = `${P} Entrega`
const VIEJA = `${P} Vieja`
const FACTURA = `${P} Factura`

let duena = ''
let desde = { id: '', nombre: '' }
let destino = { id: '', nombre: '' }
let enBlanco = { id: '', nombre: '' }

const flujoDe = (origenId: string) =>
  sql(`select id from public.flujos where origen_id = ${literal(origenId)}`)

// El origen de subasta de donde se copia: Compra → Remate (la subasta) → Entrega, una jubilada, y Entrega pide un tipo de documento del flujo.
function sembrarElDeDondeCopiar() {
  const flujo = flujoDe(desde.id)
  const fases = [
    [COMPRA, 10, true, false, false, true],
    [REMATE, 20, false, false, true, true],
    [ENTREGA, 30, false, true, false, true],
    [VIEJA, 40, false, false, false, false],
  ] as const
  for (const [nombre, orden, inicial, final, subasta, activa] of fases) {
    sql(
      `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final, es_subasta, activa)
       values (${literal(flujo)}, ${literal(nombre)}, ${String(orden)}, ${String(inicial)}, ${String(final)}, ${String(subasta)}, ${String(activa)})`,
    )
  }
  const id = (nombre: string) =>
    sql(
      `select id from public.fases where flujo_id = ${literal(flujo)} and nombre = ${literal(nombre)}`,
    )
  for (const [de, a] of [
    [COMPRA, REMATE],
    [REMATE, ENTREGA],
  ] as const) {
    sql(
      `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (${literal(flujo)}, ${literal(id(de))}, ${literal(id(a))})`,
    )
  }
  const tipo = sql(
    `insert into public.tipos_documento (flujo_id, nombre, activo, orden) values (${literal(flujo)}, ${literal(FACTURA)}, true, 10) returning id`,
  )
  sql(
    `insert into public.fases_requisitos (fase_id, tipo, orden, tipo_documento_id) values (${literal(id(ENTREGA))}, 'documento', 10, ${literal(tipo)})`,
  )
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  desde = await crearOrigenDePrueba(`${P} Subasta`, 'flujo_copia_desde', { tipo: 'subasta' })
  destino = await crearOrigenDePrueba(`${P} Destino`, 'flujo_copia_destino', { tipo: 'manual' })
  enBlanco = await crearOrigenDePrueba(`${P} En blanco`, 'flujo_copia_en_blanco')
  sembrarElDeDondeCopiar()
  duena = correoDePrueba(`duena-copia-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Celia Copia' })
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: empieza el flujo con las fases de otro origen', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${destino.id}/fases?vista=lista`)
  await expect(
    page.getByText(`El flujo de ${destino.nombre} todavía no tiene fases.`),
  ).toBeVisible()
  // Sin fases, «Nueva fase» no está en la barra: el vacío ofrece cómo empezar.
  await expect(page.getByRole('button', { name: 'Nueva fase' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Empezar en blanco' })).toBeVisible()

  await page.getByRole('button', { name: 'Empezar con las fases de…' }).click()
  const modal = page.getByRole('dialog', { name: 'Empezar con las fases de…' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/panel=copiar-fases/)
  await modal.getByLabel('Origen').selectOption({ label: desde.nombre })
  await modal.getByRole('button', { name: 'Copiar las fases' }).click()

  // La marca de subasta no se copia a un origen que no es de subasta: lo dice el mismo modal.
  await expect(modal.getByText('Listo. Esto no se copió:')).toBeVisible()
  await expect(
    modal.getByText(`Fase «${REMATE}»: era la subasta; este origen no es de subasta.`),
  ).toBeVisible()
  await modal.getByRole('button', { name: 'Listo' }).click()
  await expect(modal).toBeHidden()

  // Las fases activas, en su orden; la jubilada no.
  await expect(page.locator('[data-abre-resumen]')).toHaveText([COMPRA, REMATE, ENTREGA])
  await expect(page.getByRole('button', { name: 'Nueva fase' })).toBeVisible()
  const flujo = flujoDe(destino.id)
  expect(
    sql(`select count(*) from public.fases_transiciones where flujo_id = ${literal(flujo)}`),
  ).toBe('2')
  // El tipo propio del origen se creó en el destino y el requisito apunta a él.
  expect(
    sql(
      `select count(*) from public.fases_requisitos r
         join public.fases f on f.id = r.fase_id
         join public.tipos_documento t on t.id = r.tipo_documento_id
        where f.flujo_id = ${literal(flujo)} and t.flujo_id = ${literal(flujo)} and t.nombre = ${literal(FACTURA)}`,
    ),
  ).toBe('1')
})

test('E2E escritorio: empieza en blanco', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${enBlanco.id}/fases?vista=lista`)
  await page.getByRole('button', { name: 'Empezar en blanco' }).click()
  const modal = page.getByRole('dialog', { name: 'Nueva fase' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/panel=nueva-fase/)
  await modal.getByLabel('Nombre').fill(`${P} Primera`)
  await modal.getByLabel('Inicial', { exact: false }).check()
  await modal.getByRole('button', { name: 'Crear fase' }).click()
  await expect(modal).toBeHidden()
  await expect(page.locator('[data-abre-resumen]')).toHaveText([`${P} Primera`])
})
