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
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'

// Los tipos de cambio de la barra superior: la empresa elige en Configuración cuáles se ven a la vista («En la barra», hasta 3; sin
// ninguno, el por defecto) y quien gestiona los tipos de cambio cambia un valor ahí mismo, en el popover, viendo quién y cuándo lo cambió
// por última vez. La empresa es una fila única y los tipos de cambio son de todos: se guarda cómo estaban y se dejan así al terminar. Corre
// en los dos proyectos: el celular (412 px) muestra el primero y «+N»; el escritorio, todos. El PT409 de la RPC ya tiene su prueba SQL y su
// carrera; acá se prueba lo que dice la pantalla con dos sesiones.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const CAMBISTA = 'Carla Cambios'
const VALOR_INVALIDO = 'Escribe un valor mayor que cero, con hasta 6 decimales.'

let duena = ''
let cambista = ''
let asesora = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-barra-${proyecto}`)
  cambista = correoDePrueba(`cambista-barra-${proyecto}`)
  asesora = correoDePrueba(`asesora-barra-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Barra' })
  // Quien gestiona los tipos de cambio y nada más de la empresa, con nombre propio: es el que se ve en el último cambio.
  await crearPersona({ email: cambista, contrasena: CLAVE, nombre: CAMBISTA, invitada: true })
  await darRolDePrueba({
    email: cambista,
    rol: { nombre: `${PREFIJO_ROL_E2E}Barra ${proyecto}`, clave: `e2e_barra_${proyecto}` },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
  // Quien no los gestiona: los ve, de sólo lectura.
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: 'Ana Asesora', invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Asesora ${proyecto}`, clave: `e2e_asesora_${proyecto}` },
    permisos: ['leads.ver'],
  })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
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

const barra = (page: Page) =>
  page.locator('header [data-hueco="tipo-cambio"]').getByRole('button', { name: 'Tipos de cambio' })

// Abre el popover de la barra y espera la lista (se lee al abrirse).
async function abrirElPopover(page: Page) {
  await barra(page).click()
  const popover = page.getByRole('dialog', { name: 'Tipos de cambio' })
  await expect(popover.getByRole('listitem').filter({ hasText: 'Oficial' })).toBeVisible()
  return popover
}

// El interruptor «En la barra» de la tarjeta de un tipo de cambio de Configuración: guarda al instante.
const enLaBarraDe = (page: Page, nombre: string) =>
  page
    .getByRole('region', { name: nombre, exact: true })
    .getByRole('switch', { name: 'En la barra' })

async function ponerEnLaBarra(page: Page, nombre: string, enLaBarra: boolean) {
  const interruptor = enLaBarraDe(page, nombre)
  await expect(interruptor).toBeEnabled()
  await interruptor.click()
  await expect(page.getByText(`Tipo de cambio «${nombre}» guardado`)).toBeVisible()
  await expect(interruptor).toBeChecked({ checked: enLaBarra })
  await expect(interruptor).toBeEnabled()
}

test('la empresa marca oficial y paralelo y la barra muestra los dos', async ({
  page,
  isMobile,
}, info) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  // La semilla deja el oficial, como la migración en una base con datos: nada cambió al desplegar.
  await expect(enLaBarraDe(page, 'Oficial')).toBeChecked()
  await expect(barra(page)).toContainText('11,68')

  await ponerEnLaBarra(page, 'Paralelo', true)
  await expect(enLaBarraDe(page, 'Paralelo')).toBeChecked()
  await expect(barra(page)).toContainText('12,20')
  await expect(barra(page)).toContainText('11,68')
  // En el celular el primero y «+1»; en el escritorio los dos a la vista.
  if (isMobile) {
    await expect(barra(page).getByText('+1')).toBeVisible()
  } else {
    await expect(barra(page).getByText('+1')).toBeHidden()
    await expect(barra(page).getByText('Paralelo')).toBeVisible()
  }
  await capturar(page, info, 'barra-con-dos')

  // El popover lista todos los vigentes, cada uno con su valor.
  const popover = await abrirElPopover(page)
  await expect(popover.getByRole('listitem').filter({ hasText: 'Paralelo' })).toContainText('12,20')
  await capturar(page, info, 'popover')
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  if (process.env['E2E_CAPTURAS']) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await capturar(page, info, 'barra-200')
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
  }

  // Sin ninguno marcado, la barra vuelve al por defecto: nunca queda vacía.
  await ponerEnLaBarra(page, 'Oficial', false)
  await ponerEnLaBarra(page, 'Paralelo', false)
  await expect(barra(page)).toContainText('11,68')
  await expect(barra(page)).not.toContainText('12,20')
  await expect(enLaBarraDe(page, 'Oficial')).not.toBeChecked()
})

test('quien puede cambia un valor en el popover y ve su nombre', async ({ page }, info) => {
  await entrar(page, cambista)
  const popover = await abrirElPopover(page)
  await popover.getByRole('button', { name: 'Cambiar el valor de Oficial' }).click()
  const campo = popover.getByLabel('Valor de Oficial: 1 USD en BOB')
  await expect(campo).toBeFocused()

  // Lo que no es un valor se dice junto al campo y no se envía.
  await campo.fill('0')
  await campo.press('Enter')
  await expect(popover.getByText(VALOR_INVALIDO)).toBeVisible()
  await capturar(page, info, 'editor')

  await campo.fill('12,35')
  await campo.press('Enter')
  await expect(page.getByText('Tipo de cambio «Oficial» guardado')).toBeVisible()
  const oficial = popover.getByRole('listitem').filter({ hasText: 'Oficial' })
  await expect(oficial).toContainText('12,35')
  await expect(oficial).toContainText(`${CAMBISTA} · `)
  await expect(oficial).toContainText(/ahora|hace \d+ minutos?/)
  // La barra se pone al día sola (la revalidación de siempre).
  await expect(barra(page)).toContainText('12,35')
})

test('quien no puede los ve sin el lápiz', async ({ page }) => {
  await entrar(page, asesora)
  const popover = await abrirElPopover(page)
  // El último cambio sí se ve: quién y cuándo.
  await expect(popover.getByRole('listitem').filter({ hasText: 'Oficial' })).toContainText(CAMBISTA)
  await expect(popover.getByRole('button', { name: /^Cambiar el valor de/ })).toHaveCount(0)
  await expect(popover.getByRole('link', { name: 'Configurar los tipos de cambio' })).toHaveCount(0)
})

test('dos sesiones dan el conflicto con nombre y valor', async ({ page, browser }, info) => {
  await entrar(page, duena)
  const popover = await abrirElPopover(page)
  await popover.getByRole('button', { name: 'Cambiar el valor de Paralelo' }).click()
  const campo = popover.getByLabel('Valor de Paralelo: 1 USD en BOB')
  await expect(campo).toBeFocused()

  // Mientras la dueña tiene el editor abierto, la cambista lo cambia desde su popover.
  const suya = await otraPersona(browser, page)
  await entrar(suya, cambista)
  const suPopover = await abrirElPopover(suya)
  await suPopover.getByRole('button', { name: 'Cambiar el valor de Paralelo' }).click()
  const suCampo = suPopover.getByLabel('Valor de Paralelo: 1 USD en BOB')
  await suCampo.fill('12,40')
  await suCampo.press('Enter')
  await expect(suya.getByText('Tipo de cambio «Paralelo» guardado')).toBeVisible()
  await suya.context().close()

  // La dueña guarda sobre la versión vieja: el conflicto dice quién, a cuánto y cuándo, y no se guardó nada.
  await campo.fill('12,50')
  await campo.press('Enter')
  const aviso = popover.getByText(`${CAMBISTA} lo cambió a`)
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText('12,40')
  await expect(aviso).toContainText(/hace (un momento|\d+ minutos?)/)
  await capturar(page, info, 'conflicto')

  // «Recargar» trae su versión; guardar de nuevo pasa.
  await popover.getByRole('button', { name: 'Recargar', exact: true }).click()
  await expect(campo).toHaveValue('12,4')
  await campo.fill('12,50')
  await campo.press('Enter')
  await expect(page.getByText('Tipo de cambio «Paralelo» guardado')).toBeVisible()
  await expect(popover.getByRole('listitem').filter({ hasText: 'Paralelo' })).toContainText('12,50')

  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()

  // El Modo Live oculta sólo los símbolos de moneda: el lápiz sigue.
  const live = page.getByRole('button', { name: 'Modo Live: ocultar los símbolos de moneda' })
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'true')
  const conLive = await abrirElPopover(page)
  await expect(conLive.getByRole('button', { name: /^Cambiar el valor de/ }).first()).toBeVisible()
  await expect(
    conLive
      .getByRole('listitem')
      .filter({ hasText: 'Paralelo' })
      .locator('[data-monto-sin-moneda]'),
  ).toHaveText(/^12,50$/)
  await capturar(page, info, 'live')
  await page.keyboard.press('Escape')
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'false')
})
