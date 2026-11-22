import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { nuevoLead, ponerExtras } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  ajustesDeFabricaDeTelefonos,
  fijarAjustesDeTelefonos,
} from './soporte/leads-telefonos-extra'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en el celular (.claude/rules/e2e.md › «Pruebas: sólo lo clave»)

// la tarjeta «Teléfonos extra» de Configuración › Leads contra la app compilada: la dueña cambia el máximo y enciende la regla, se guarda y se relee, y con
// un choque ya sembrado la lista lo muestra enmascarado y con enlace al lead. Al terminar, los ajustes vuelven a lo de fábrica (un solo
// worker: los demás specs ven 6 y la regla apagada).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  await ajustesDeFabricaDeTelefonos()
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await ajustesDeFabricaDeTelefonos()
  await limpiarListado(t)
})

async function ajustesEnLaBase() {
  const { data, error } = await admin()
    .from('ajustes_leads')
    .select('telefonos_extra_maximo, telefonos_extra_como_principal')
    .eq('id', 1)
    .single<{ telefonos_extra_maximo: number; telefonos_extra_como_principal: boolean }>()
  exigir(error, 'leer los ajustes de teléfonos extra')
  return data
}

test('la dueña cambia el máximo y enciende la regla, y se guarda', async ({ page }) => {
  await entrar(page, t.personas.duena)
  await page.goto('/configuracion/leads')
  const tarjeta = page.getByRole('region', { name: 'Teléfonos extra', exact: true })
  await expect(tarjeta).toContainText('6')
  await tarjeta.getByRole('button', { name: 'Más acciones de Teléfonos extra' }).click()
  await expect(page.getByRole('menuitem', { name: 'Números repetidos' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await tarjeta.getByRole('button', { name: 'Editar Teléfonos extra', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Teléfonos extra', exact: true })
  const maximo = modal.getByLabel('Máximo de teléfonos extra')
  await expect(maximo).toHaveValue('6')

  // Fuera del rango, el motivo sale junto al campo y no se envía.
  await maximo.fill('25')
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(modal.getByText('El máximo va de 0 a 20.')).toBeVisible()
  expect(await ajustesEnLaBase()).toMatchObject({ telefonos_extra_maximo: 6 })

  await maximo.fill('3')
  await modal.getByRole('switch', { name: 'Los teléfonos extra cuentan como el principal' }).click()
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(modal).toBeHidden()
  expect(await ajustesEnLaBase()).toEqual({
    telefonos_extra_maximo: 3,
    telefonos_extra_como_principal: true,
  })
  // Se relee desde la base: la tarjeta lo dice y ofrece «Números repetidos».
  await page.reload()
  await expect(tarjeta).toContainText('3')
  await tarjeta.getByRole('button', { name: 'Más acciones de Teléfonos extra' }).click()
  await expect(page.getByRole('menuitem', { name: 'Números repetidos' })).toBeVisible()
})

test('con un choque ya sembrado, la lista lo muestra enmascarado y con enlace al lead', async ({
  page,
}, info) => {
  await fijarAjustesDeTelefonos(6, false)
  const principal = await nuevoLead({
    corto: `Choque principal ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const repetido = await nuevoLead({
    corto: `Choque repetido ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  // Un extra del segundo lead que es el principal del primero: ya se repetía antes de encender la regla.
  await ponerExtras(repetido.id, [{ telefono: principal.telefono, etiqueta: null }])
  await fijarAjustesDeTelefonos(6, true)

  await entrar(page, t.personas.duena)
  await page.goto('/configuracion/leads')
  await page
    .getByRole('region', { name: 'Teléfonos extra', exact: true })
    .getByRole('button', { name: 'Más acciones de Teléfonos extra' })
    .click()
  await page.getByRole('menuitem', { name: 'Números repetidos' }).click()
  const modal = page.getByRole('dialog', { name: 'Números repetidos', exact: true })
  await expect(modal).toBeVisible()
  const fila = modal.getByRole('listitem').filter({ hasText: repetido.nombre })
  await expect(fila).toBeVisible()
  await expect(fila.getByRole('link', { name: principal.nombre })).toHaveAttribute(
    'href',
    `/leads/${principal.id}`,
  )
  await expect(fila.getByRole('link', { name: repetido.nombre })).toHaveAttribute(
    'href',
    `/leads/${repetido.id}`,
  )
  await expect(fila).toContainText('(principal)')
  // El número nunca va completo.
  await expect(modal).not.toContainText(principal.telefono)
})
