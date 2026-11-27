import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  editarTarjeta,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'
import { sql } from './soporte/sql'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en movil; el celular se mira en el recorrido de la IA

// Las tres páginas de ajustes de Configuración › Empresa (Datos, Integraciones, Comprobantes) son tarjetas con lo guardado a la vista y un
// modal por tarjeta (`?panel=<tarjeta>`). Aquí, el camino feliz de cada una y el `PT409` del patrón compartido; lo fino de cada modal, en
// `empresa*.spec.ts`. La empresa es una fila única: se deja como estaba.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-tarjetas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Tarjetas' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

test('Datos: «Editar» abre el modal, guardar lo cierra y la tarjeta dice lo nuevo; recargar con ?panel= lo abre', async ({
  page,
}) => {
  await entrar(page)
  await page.goto('/configuracion/empresa')

  const identidad = await editarTarjeta(page, 'Identidad')
  await expect(page).toHaveURL(/panel=identidad/)
  const nombre = `Tarjetas ${Date.now()}`
  await identidad.getByLabel('Nombre de la empresa').fill(nombre)
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(identidad).toBeHidden()
  await expect(page.getByRole('region', { name: 'Identidad', exact: true })).toContainText(nombre)

  await page.goto('/configuracion/empresa?panel=region')
  await expect(page.getByRole('dialog', { name: 'Región', exact: true })).toBeVisible()
})

test('PT409: si otra persona guardó antes, «Recargar» conserva lo tipeado y «Guardar» guarda', async ({
  page,
}) => {
  await entrar(page)
  await page.goto('/configuracion/empresa')
  const legales = await editarTarjeta(page, 'Datos legales y de contacto')
  await legales.getByLabel('NIT').fill('1020304050')

  sql('update public.ajustes_empresa set actualizado_en = clock_timestamp() where id = 1')
  await legales.getByRole('button', { name: 'Guardar', exact: true }).click()
  const recargar = legales.getByRole('button', { name: 'Recargar', exact: true })
  await expect(recargar).toBeVisible()
  await recargar.click()
  await expect(recargar).toBeHidden()
  await expect(legales.getByLabel('NIT')).toHaveValue('1020304050')

  await legales.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(legales).toBeHidden()
  await expect(
    page.getByRole('region', { name: 'Datos legales y de contacto', exact: true }),
  ).toContainText('1020304050')
})

test('Integraciones: las tres tarjetas con su estado y «Configurar» de apibara guarda la dirección', async ({
  page,
}) => {
  await entrar(page)
  await page.goto('/configuracion/empresa/integraciones')
  for (const nombre of ['apibara', 'Web pública', 'Avisos push']) {
    await expect(
      page.getByRole('region', { name: nombre, exact: true }).locator('[data-slot=badge]'),
    ).toBeVisible()
  }

  const tarjeta = page.getByRole('region', { name: 'apibara', exact: true })
  await tarjeta.getByRole('button', { name: 'Configurar apibara', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Configurar apibara' })
  await modal.getByLabel('Dirección del servicio').fill('https://api.apibara.tech/v3')
  await modal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Configuración de apibara guardada')).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(tarjeta.getByText('https://api.apibara.tech/v3')).toBeVisible()
})

test('Comprobantes: la tarjeta abre su modal con ?panel=serie', async ({ page }) => {
  await entrar(page)
  await page.goto('/configuracion/empresa/comprobantes')
  await page
    .getByRole('region', { name: 'Serie de comprobantes' })
    .getByRole('button', { name: 'Cambiar la serie', exact: true })
    .click()
  await expect(page).toHaveURL(/panel=serie/)
  await expect(page.getByRole('dialog', { name: 'Cambiar serie' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Cambiar serie' })).toBeHidden()
})

// A 1440×900 Integraciones y Comprobantes entran enteras: sin desplazar la página ni el `main`. Datos de la empresa, con siete tarjetas en
// dos columnas, ya no cabe y se desplaza.
test('a 1440×900 ni Integraciones ni Comprobantes se desplazan', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await contexto.newPage()
  try {
    await entrar(page)
    const medidas: string[] = []
    for (const ruta of [
      '/configuracion/empresa/integraciones',
      '/configuracion/empresa/comprobantes',
    ]) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const sobra = await page.evaluate(() => {
        const pagina = document.scrollingElement
        const principal = document.querySelector('main')
        return {
          pagina: pagina ? pagina.scrollHeight - window.innerHeight : 0,
          principal: principal ? principal.scrollHeight - principal.clientHeight : 0,
        }
      })
      if (sobra.pagina > 0 || sobra.principal > 0) {
        medidas.push(
          `${ruta}: sobran ${sobra.pagina} px de la página y ${sobra.principal} del main`,
        )
      }
    }
    expect(medidas).toEqual([])
  } finally {
    await contexto.close()
  }
})
