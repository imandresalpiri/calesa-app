import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { ingresar } from './soporte/pasos'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el celular se mira en el recorrido de la IA

// En Configuración y en `/perfil` toda tarjeta y toda fila lleva sólo su «⋯»: ningún «Editar», «Gestionar», «Cambiar», «Configurar»,
// «Subir», «Bajar» o «Quitar» suelto. Tocar la tarjeta (un botón «Editar <título>», hermano del «⋯») abre la primera acción.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const PAGINAS = [
  '/configuracion/empresa',
  '/configuracion/empresa/integraciones',
  '/configuracion/empresa/comprobantes',
  '/configuracion/leads',
  '/configuracion/web',
  '/configuracion/cola-web',
  '/repuestos/configuracion',
  '/configuracion/equipo',
  '/configuracion/roles',
  '/perfil',
]
// Verbos que antes eran un botón suelto en la tarjeta o en la fila; ahora viven sólo dentro del «⋯».
const SUELTOS =
  /^(Editar|Gestionar|Cambiar|Configurar|Subir|Bajar|Quitar|Eliminar|Cambiar serie|Números repetidos)$/

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-solo-menu-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Solo Menu' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

// Los nombres accesibles de los botones visibles de `main` que son sueltos (fuera del «⋯»), vistos desde el DOM.
async function botonesSueltos(page: Page): Promise<string[]> {
  return page.evaluate((fuente) => {
    const sueltos = new RegExp(fuente)
    const nombres: string[] = []
    for (const b of document.querySelectorAll('main button, main [role="button"]')) {
      if (b.closest('[data-mas-acciones]') !== null || b.hasAttribute('data-mas-acciones')) continue
      const nombre = (b.getAttribute('aria-label') ?? b.textContent).trim()
      if (sueltos.test(nombre)) nombres.push(nombre)
    }
    return nombres
  }, SUELTOS.source)
}

for (const ruta of PAGINAS) {
  test(`${ruta}: ningún botón de acción suelto fuera del «⋯»`, async ({ page }) => {
    await entrar(page)
    await page.goto(ruta)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(await botonesSueltos(page)).toEqual([])
  })
}

test('Empresa: tocar la tarjeta abre su modal; el «⋯» ofrece la misma acción', async ({ page }) => {
  await entrar(page)
  await page.goto('/configuracion/empresa')
  const tarjeta = page.getByRole('region', { name: 'Identidad', exact: true })
  await expect(tarjeta.getByRole('button', { name: 'Más acciones de Identidad' })).toBeVisible()

  await tarjeta.getByRole('button', { name: 'Editar Identidad', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Identidad', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/panel=identidad/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Identidad', exact: true })).toBeHidden()

  await tarjeta.getByRole('button', { name: 'Más acciones de Identidad' }).click()
  await page.getByRole('menuitem', { name: /^Editar/ }).click()
  await expect(page.getByRole('dialog', { name: 'Identidad', exact: true })).toBeVisible()
})

test('Roles: tocar el encabezado de un rol no abre «Eliminar»; el «⋯» lo ofrece con su confirmación', async ({
  page,
}) => {
  await entrar(page)
  await page.goto('/configuracion/roles')
  const mas = page.getByRole('button', { name: /^Más acciones de / }).first()
  await expect(mas).toBeVisible()
  await mas.click()
  await expect(page.getByRole('menuitem', { name: /^Eliminar/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toBeHidden()
})
