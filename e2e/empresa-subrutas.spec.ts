// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el selector del celular se mira en el recorrido de la IA
import { expect, test, type Browser, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { ingresar } from './soporte/pasos'

// Configuración › Empresa en sub-rutas (`docs/UX.md` › «Empresa»): las URLs de cuando tenía pestañas llegan a su sub-ruta, y quien no abre
// «Comprobantes» la ve apagada con su motivo y su URL lo lleva a Datos. No cambia nada de la empresa: sólo abre un panel sin guardar.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let cambista = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-subrutas-${proyecto}`)
  cambista = correoDePrueba(`cambista-subrutas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Subrutas' })
  // Alguien que gestiona los tipos de cambio y nada más de la empresa.
  await crearPersona({
    email: cambista,
    contrasena: CLAVE,
    nombre: 'Carla Subrutas',
    invitada: true,
  })
  await darRolDePrueba({
    email: cambista,
    rol: { nombre: `${PREFIJO_ROL_E2E}Subrutas ${proyecto}`, clave: `e2e_subrutas_${proyecto}` },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Otra persona, en su propio navegador (sus cookies no se mezclan con las de la dueña).
async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

function menuDeConfiguracion(page: Page) {
  return page.getByRole('navigation', { name: 'Secciones de Configuración' })
}

test('E2E sin «Ajustes de la empresa», Comprobantes está apagada con su motivo y su URL abre Datos', async ({
  page,
  browser,
}) => {
  await page.goto('/ingreso')
  const suya = await otraPersona(browser, page)
  await entrar(suya, cambista)
  await suya.goto('/configuracion/empresa')
  const menu = menuDeConfiguracion(suya)
  await expect(menu.getByText('Comprobantes', { exact: true })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(menu.getByRole('link', { name: 'Comprobantes' })).toHaveCount(0)
  await expect(menu.getByText('Pide el permiso «Ajustes de la empresa».')).toBeVisible()

  await suya.goto('/configuracion/empresa/comprobantes')
  await expect(suya).toHaveURL('/configuracion/empresa')
  await expect(suya.getByRole('heading', { name: 'Datos de la empresa', level: 1 })).toBeVisible()
  await suya.context().close()
})

test('E2E las URLs viejas de Empresa llegan a su sub-ruta', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  await page.getByRole('button', { name: /^Editar Oficial/ }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Oficial' })).toBeVisible()
  const tc = new URL(page.url()).searchParams.get('tc') ?? ''
  expect(tc).not.toBe('')

  // La pestaña Monedas con el panel de un tipo de cambio abierto.
  await page.goto(`/configuracion/empresa?seccion=monedas&tc=${tc}`)
  await expect(page).toHaveURL(`/configuracion/empresa/monedas?tc=${tc}`)
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Oficial' })).toBeVisible()

  await page.goto('/configuracion/empresa?seccion=integraciones')
  await expect(page).toHaveURL('/configuracion/empresa/integraciones')
  await expect(page.getByRole('heading', { name: 'Integraciones', level: 1 })).toBeVisible()

  // El panel de crear una moneda, sin `seccion`.
  await page.goto('/configuracion/empresa?panel=nueva-moneda')
  await expect(page).toHaveURL('/configuracion/empresa/monedas?panel=nueva-moneda')
  await expect(page.getByRole('dialog')).toBeVisible()
})
