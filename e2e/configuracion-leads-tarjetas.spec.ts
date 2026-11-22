import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en el celular (.claude/rules/e2e.md › «Pruebas: sólo lo clave»)

// Configuración › Leads en una sola página (T433), contra la app compilada: las seis tarjetas, cada «Editar» abre su modal por `?panel=` y el
// modal de un ítem (Nuevo tipo) vuelve a la lista de su tarjeta al cerrarse. Las redirecciones de las URL viejas están en `configuracion-leads.spec.ts`
// y lo que guarda cada tarjeta, en sus specs.
let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-leads-tarjetas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Tarjetas' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const TARJETAS = [
  { tarjeta: 'Tipos de lead', dialogo: 'Tipos de lead', panel: 'tipos' },
  { tarjeta: 'Orígenes del lead', dialogo: 'Orígenes del lead', panel: 'origenes' },
  { tarjeta: 'Tipos de seguimiento', dialogo: 'Tipos de seguimiento', panel: 'seguimientos' },
  { tarjeta: 'Embudo', dialogo: 'Plantilla del embudo', panel: 'embudo' },
  { tarjeta: 'Mensaje del portal', dialogo: 'Mensaje del portal', panel: 'portal' },
  { tarjeta: 'Teléfonos extra', dialogo: 'Teléfonos extra', panel: 'telefonos' },
] as const

test('las seis tarjetas están en una página y cada «Editar» abre su modal por la URL', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/leads')
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeVisible()

  for (const { tarjeta, dialogo, panel } of TARJETAS) {
    const region = page.getByRole('region', { name: tarjeta, exact: true })
    await expect(region, tarjeta).toBeVisible()
    await region.getByRole('button', { name: `Editar ${tarjeta}`, exact: true }).click()
    await expect(page, tarjeta).toHaveURL(new RegExp(`[?&]panel=${panel}$`))
    const modal = page.getByRole('dialog', { name: dialogo, exact: true })
    await expect(modal, tarjeta).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal, tarjeta).toBeHidden()
    await expect(page, tarjeta).toHaveURL('/configuracion/leads')
  }
})

test('el modal de un ítem vuelve a la lista de su tarjeta al cerrarse', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/leads?panel=tipos')
  const lista = page.getByRole('dialog', { name: 'Tipos de lead', exact: true })
  await lista.getByRole('button', { name: 'Nuevo tipo' }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo tipo', exact: true })
  await expect(nuevo).toBeVisible()
  await expect(lista).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(nuevo).toBeHidden()
  await expect(page).toHaveURL(/[?&]panel=tipos$/)
  await expect(lista).toBeVisible()
})
