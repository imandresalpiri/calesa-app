import { expect, test, type Locator, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  editarTarjeta,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// Guardar sin perder lo que se teclea alrededor, y que el aviso de guardado no tape lo de abajo: la
// pantalla se vuelve a dibujar con lo guardado (el formulario se reemplaza) y lo tipeado tiene que
// sobrevivir. La empresa es una fila única: se deja exactamente como estaba, para el spec que sigue.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-empresa-guardado-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Prueba' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Con cambios sin guardar, recargar pregunta (`beforeunload`): aquí se acepta, para ver lo que el borrador repone.
async function recargarConCambios(page: Page) {
  page.once('dialog', (dialogo) => void dialogo.accept())
  await page.reload()
}

// El orden de los eventos, fijo: el servidor responde cuando la prueba quiere. Mientras guarda, el modal no se puede teclear ni cerrar
// por descuido; al llegar lo guardado, se cierra y la tarjeta muestra lo nuevo.
test('mientras guarda no se puede teclear, y al llegar lo guardado el modal se cierra', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  const razon = `Demora ${Date.now()} SRL`
  const legales = await editarTarjeta(page, 'Datos legales y de contacto')
  await legales.getByLabel('Razón social').fill(razon)

  let soltar = () => {}
  const retenida = new Promise<void>((resolver) => {
    soltar = resolver
  })
  await page.route(
    (url) => url.pathname === '/configuracion/empresa',
    async (ruta) => {
      if (ruta.request().method() === 'POST' && 'next-action' in ruta.request().headers()) {
        await retenida
      }
      await ruta.fallback()
    },
  )
  try {
    await legales.getByRole('button', { name: /^Guard/ }).click()
    await expect(legales.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    await expect(legales.getByLabel('NIT')).toBeDisabled()
    await expect(legales.getByLabel('Razón social')).toBeDisabled()
  } finally {
    soltar()
  }
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(legales).toBeHidden()
  await expect(
    page.getByRole('region', { name: 'Datos legales y de contacto', exact: true }),
  ).toContainText(razon)

  // Lo que se teclea después y no se guarda sobrevive a recargar.
  const otra = await editarTarjeta(page, 'Datos legales y de contacto')
  await otra.getByLabel('NIT').fill('7070707070')
  await expect(otra.getByLabel('NIT')).toHaveValue('7070707070')
  await recargarConCambios(page)
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Datos legales y de contacto' }).getByLabel('NIT'),
  ).toHaveValue('7070707070')
})

// Un aviso es de paso: no puede tapar lo que la persona acaba de usar. Tras guardar, el pie del panel
// («Cerrar», «Guardar») queda justo donde sale el aviso. Se mide con el navegador, sin depender de la
// carga: en el centro de cada botón, quién recibe el clic (`elementFromPoint`).
async function quieto(aviso: Locator) {
  let anterior = ''
  await expect
    .poll(async () => {
      const ahora = JSON.stringify(await aviso.boundingBox())
      const igual = ahora === anterior
      anterior = ahora
      return igual
    })
    .toBe(true)
}

async function recibeElClic(boton: Locator): Promise<boolean> {
  await boton.scrollIntoViewIfNeeded()
  return boton.evaluate((el) => {
    const caja = el.getBoundingClientRect()
    const arriba = document.elementFromPoint(caja.x + caja.width / 2, caja.y + caja.height / 2)
    return arriba !== null && el.contains(arriba)
  })
}

test('los avisos no tapan los botones del panel, y su acción se pulsa', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  await page.getByRole('button', { name: /^Editar Oficial/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Oficial' })).toBeVisible()

  // Dos avisos apilados, con la animación de entrada terminada.
  const avisos = page.locator('[data-sonner-toast]')
  for (const valor of ['7,50', '7,51']) {
    // Con Enter, no con el puntero: el primer aviso ya está sobre el botón.
    await panel.getByLabel(/^Valor/).fill(valor)
    await panel.getByLabel(/^Valor/).press('Enter')
    await expect(avisos.filter({ hasText: 'Oficial' })).toHaveCount(valor === '7,50' ? 1 : 2)
    // El aviso sale antes de que el panel se dibuje con lo guardado: el historial dice cuándo.
    await expect(panel.getByRole('listitem').filter({ hasText: valor })).toBeVisible()
  }
  for (const aviso of await avisos.all()) {
    await quieto(aviso)
  }

  // Lo de abajo del panel recibe el clic, no el aviso.
  expect(await recibeElClic(panel.getByRole('button', { name: 'Cerrar' }).first())).toBe(true)
  expect(await recibeElClic(panel.getByRole('button', { name: 'Guardar' }))).toBe(true)

  // Y con el teclado: Escape cierra el panel con los avisos abiertos.
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  // Un aviso con acción sigue pulsable: lo tipeado y sin guardar se recupera, y se puede descartar.
  await page.goto('/configuracion/empresa')
  const legales = await editarTarjeta(page, 'Datos legales y de contacto')
  await legales.getByLabel('NIT').fill('9090909090')
  await recargarConCambios(page)
  const recuperado = page.locator('[data-sonner-toast]').filter({ hasText: 'Recuperamos' })
  await expect(recuperado).toBeVisible()
  await quieto(recuperado)
  const descartar = recuperado.getByRole('button', { name: 'Descartar' })
  expect(await recibeElClic(descartar)).toBe(true)
  await descartar.click()
  await expect(
    page.getByRole('dialog', { name: 'Datos legales y de contacto' }).getByLabel('NIT'),
  ).toHaveValue('')
})

test('Esc con cambios pregunta, «Seguir editando» conserva y «Descartar» cierra sin guardar', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  const identidad = await editarTarjeta(page, 'Identidad')
  const nombre = identidad.getByLabel('Nombre de la empresa')
  const guardado = await nombre.inputValue()

  await nombre.fill(`${guardado} Modal`)
  await page.keyboard.press('Escape')
  await expect(identidad.getByRole('button', { name: 'Seguir editando' })).toBeVisible()
  await identidad.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(nombre).toHaveValue(`${guardado} Modal`)

  await page.keyboard.press('Escape')
  await identidad.getByRole('button', { name: 'Descartar' }).click()
  await expect(identidad).toBeHidden()
  await expect(page).toHaveURL('/configuracion/empresa')
  await expect(page.getByRole('region', { name: 'Identidad', exact: true })).not.toContainText(
    'Modal',
  )
})
