// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { admin } from './soporte/base'
import { editarTarjeta } from './soporte/empresa'
import { entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { sql } from './soporte/sql'

// «Ajustes» y «Legales» del sitio son tarjetas con lo guardado a la vista y un modal por tarjeta (`?panel=`). Aquí lo que no prueban los specs de cada
// parte: el `PT409` del patrón compartido (la fila de `ajustes_web` es una, con una sola versión), el `?panel=` por la URL y que a 1440×900 ninguna de
// las dos páginas se desplaza. `ajustes_web` se restaura al final (un solo worker).
test.describe.configure({ mode: 'serial' })

type Guardado = { nombre_sitio: string | null; lema: string | null; actualizado_por: string | null }

let duena = ''
let antes: Guardado | null = null

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, ['web.ajustes.gestionar'])
  duena = terreno.duena
  antes = JSON.parse(
    sql(
      'select row_to_json(t) from (select nombre_sitio, lema, actualizado_por from public.ajustes_web where id = 1) t',
    ),
  ) as Guardado
})

test.afterAll(async () => {
  if (antes) {
    const { error } = await admin().from('ajustes_web').update(antes).eq('id', 1)
    if (error) {
      throw new Error(`No se pudieron restaurar los ajustes de la web: ${error.message}`)
    }
  }
  await limpiarInventario()
})

test('PT409: si otra persona guardó antes, «Recargar» conserva lo tipeado y «Guardar» guarda', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/web/ajustes')
  const identidad = await editarTarjeta(page, 'Identidad del sitio')
  await identidad.getByLabel('Nombre del sitio', { exact: true }).fill('Autos de la Tarjeta')

  sql('update public.ajustes_web set actualizado_en = clock_timestamp() where id = 1')
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  const recargar = identidad.getByRole('button', { name: 'Recargar' })
  await expect(recargar).toBeVisible()
  await recargar.click()
  await expect(recargar).toBeHidden()
  await expect(identidad.getByLabel('Nombre del sitio', { exact: true })).toHaveValue(
    'Autos de la Tarjeta',
  )

  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes del sitio guardados')).toBeVisible()
  await expect(identidad).toBeHidden()
  await expect(
    page.getByRole('region', { name: 'Identidad del sitio', exact: true }),
  ).toContainText('Autos de la Tarjeta')
})

test('con ?panel= en la URL abre el modal de su tarjeta', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/web/ajustes?panel=seo')
  await expect(page.getByRole('dialog', { name: 'SEO', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'SEO', exact: true })).toBeHidden()

  await page.goto('/configuracion/web/legales?panel=privacidad')
  await expect(
    page.getByRole('dialog', { name: 'Política de privacidad', exact: true }),
  ).toBeVisible()
})

// A 1440×900 cada página entra entera: sin desplazar la página ni el `main`.
async function sobra(page: Page) {
  return page.evaluate(() => {
    const pagina = document.scrollingElement
    const principal = document.querySelector('main')
    return {
      pagina: pagina ? pagina.scrollHeight - window.innerHeight : 0,
      principal: principal ? principal.scrollHeight - principal.clientHeight : 0,
    }
  })
}

test('a 1440×900 ni Ajustes ni Legales se desplazan', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await contexto.newPage()
  try {
    await entrar(page, duena)
    const medidas: string[] = []
    for (const ruta of ['/configuracion/web/ajustes', '/configuracion/web/legales']) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('region').first()).toBeVisible()
      const medida = await sobra(page)
      if (medida.pagina > 0 || medida.principal > 0) {
        medidas.push(
          `${ruta}: sobran ${medida.pagina} px de la página y ${medida.principal} del main`,
        )
      }
    }
    expect(medidas).toEqual([])
  } finally {
    await contexto.close()
  }
})
