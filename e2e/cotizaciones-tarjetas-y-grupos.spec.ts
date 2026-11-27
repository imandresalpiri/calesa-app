import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { expect, test, type Page } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La lista de cotizaciones en tarjetas y agrupada por vehículo (`docs/UX.md` › «Cotizaciones», T319 y T415): por defecto tarjetas y agrupada; un vehículo con cuatro
// cotizaciones es una tarjeta con la imagen de la tarjeta de su aprobada (la miniatura) y «4 cotizaciones de este vehículo», que abre un modal (`?panel=cotizaciones-del-vehiculo&vehiculo=`)
// con la aprobada primero, sus casillas y «Comparar» en el pie, de a 10 con «Ver más»; elegir una línea lo cierra y abre su resumen; la lista no despliega nada; una sin vehículo va suelta; «Compartir» de la tarjeta abre su panel y el «⋯» de la tarjeta no lo repite (en la tabla va primero, con la columna
// «Título»); «Tabla | Tarjetas» y «Agrupar por vehículo» se recuerdan; «Mías» deja en el grupo sólo las suyas; las tarjetas miden lo mismo; la imagen abre el visor y
// la tarjeta el resumen; en Modo Live «Compartir» sigue y la imagen va sin moneda. El terreno es el de `soporte/cotizaciones-final.ts` (sembrado sin triggers: la aprobada se rellena a mano).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal
// El grupo: tres de la dueña y una de Ana sobre el mismo vehículo (la aprobada, la más vieja); y una sin vehículo.
let grupo: { vehiculoId: string; ids: string[] }
let aprobada: string
let suelta: string
// Otro vehículo con doce de la dueña: el modal pide de a 10 y «Ver más» trae las otras dos.
let grande: { vehiculoId: string; ids: string[] }

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
  const sembrado = await sembrarParaMarcar(t, 'Tarjetas del grupo', { cuantas: 3 })
  const vehiculoId = sembrado.vehiculoId ?? ''
  sembrarCotizaciones({
    origenId: t.origen.id,
    vehiculoId,
    creadoPor: idDePersona(t.ana),
    cuantas: 1,
    desde: 30,
  })
  sql('select public._cotizaciones_aprobadas_rellenar();')
  grupo = {
    vehiculoId,
    ids: sql(
      `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculoId)}::uuid order by creado_en desc, id desc`,
    )
      .split('\n')
      .filter((id) => id !== ''),
  }
  aprobada = sql(
    `select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculoId)}::uuid`,
  ).trim()
  suelta = (await sembrarParaMarcar(t, 'Tarjetas suelta', { sinVehiculo: true })).ids[0] ?? ''
  const doce = await sembrarParaMarcar(t, 'Tarjetas grande', { cuantas: 12 })
  grande = { vehiculoId: doce.vehiculoId ?? '', ids: doce.ids }
})

test.afterAll(async () => {
  await limpiarFinal()
})

const deLaPrueba = (resto = ''): string => `/cotizaciones?origen=${t.origen.id}${resto}`
// Por el marco de su imagen, que lleva el id (la imagen se pide recién a la vista).
const tarjetaDe = (page: Page, id: string) =>
  page.locator('article').filter({ has: page.locator(`[data-imagen-de-la-tarjeta="${id}"]`) })
const conteo = (page: Page) => page.getByRole('button', { name: /cotizaciones de este vehículo$/ })

async function abrir(page: Page, ruta: string): Promise<void> {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(ruta)
  await expect(page.locator('tbody tr, article').first()).toBeVisible()
}

const modalDelGrupo = (page: Page) => page.getByRole('dialog', { name: /^Cotizaciones de / })
const panelDe = (page: Page) => new URL(page.url()).searchParams.get('panel')
const vehiculoDe = (page: Page) => new URL(page.url()).searchParams.get('vehiculo')

test('E2E por defecto, tarjetas agrupadas: el grupo con la imagen de su aprobada y su conteo abre el modal del vehículo, con la aprobada primero y «Comparar» en el pie; la suelta va sola', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba())
  expect(grupo.ids).toHaveLength(4)
  const delGrupo = tarjetaDe(page, aprobada)
  await expect(delGrupo).toHaveCount(1)
  // La miniatura de la imagen de la aprobada: se pide al llegar a la vista.
  await delGrupo.scrollIntoViewIfNeeded()
  await expect(delGrupo.locator('[data-imagen-de-la-tarjeta] img')).toHaveAttribute(
    'src',
    /imagen\?ancho=480/,
  )
  const boton = delGrupo.getByRole('button', { name: '4 cotizaciones de este vehículo' })
  // La suelta: su tarjeta, sin conteo; los dos grupos (el de 4 y el de 12), con el suyo.
  await expect(tarjetaDe(page, suelta)).toHaveCount(1)
  await expect(conteo(page)).toHaveCount(2)
  await capturar(page, info, 'tarjetas-agrupadas')

  await boton.click()
  await expect.poll(() => panelDe(page)).toBe('cotizaciones-del-vehiculo')
  expect(vehiculoDe(page)).toBe(grupo.vehiculoId)
  const modal = modalDelGrupo(page)
  await expect(modal).toBeVisible()
  const lineas = modal.locator('[data-linea-del-grupo]')
  await expect(lineas).toHaveCount(4)
  // La aprobada va primera y lo dice; después las más nuevas primero.
  await expect(lineas.first()).toHaveAttribute('data-linea-del-grupo', aprobada)
  await expect(lineas.first()).toContainText('Aprobada')
  await expect(modal.getByRole('heading', { name: /^Cotizaciones de / })).toBeVisible()
  await capturar(page, info, 'modal-del-vehiculo')
  // La lista de atrás no desplegó nada.
  await expect(page.locator('[data-despliegue-del-grupo]')).toHaveCount(0)
  // «Comparar» está en el pie del modal, apagado hasta elegir dos.
  const pie = modal.locator('[data-slot="dialog-footer"]')
  await expect(pie.getByRole('button', { name: 'Comparar' })).toBeDisabled()
  const casillas = modal.locator('[data-casilla-de-comparar]')
  await casillas.nth(0).click()
  await casillas.nth(1).click()
  await expect(pie.getByRole('link', { name: 'Comparar' })).toHaveAttribute(
    'href',
    new RegExp(`^/cotizaciones/comparar\\?ids=${aprobada},`),
  )
  await capturar(page, info, 'modal-del-vehiculo-comparar')

  // Esc lo cierra, borra su URL y el foco vuelve al conteo.
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect.poll(() => panelDe(page)).toBeNull()
  expect(vehiculoDe(page)).toBeNull()
  await expect(boton).toBeFocused()
})

test('E2E el modal del vehículo pide de a 10 con «Ver más», y una línea lo cierra y abre su resumen', async ({
  page,
}) => {
  await abrir(page, deLaPrueba())
  await page.getByRole('button', { name: '12 cotizaciones de este vehículo' }).click()
  const modal = modalDelGrupo(page)
  const lineas = modal.locator('[data-linea-del-grupo]')
  await expect(lineas).toHaveCount(10)
  await modal.getByRole('button', { name: 'Ver más' }).click()
  await expect(lineas).toHaveCount(12)
  await expect(modal.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  // Una línea cierra el modal y abre su resumen, en un solo paso.
  const otra = grande.ids[3] ?? ''
  await modal.locator(`[data-linea-del-grupo="${otra}"]`).click()
  await expect(modal).toBeHidden()
  await expect.poll(() => new URL(page.url()).searchParams.get('cotizacion')).toBe(otra)
  expect(panelDe(page)).toBeNull()
  expect(vehiculoDe(page)).toBeNull()
  await expect(page.getByRole('dialog', { name: /^Cotización n\.º \d+$/ })).toBeVisible()
})

test('E2E el enlace del modal abre las cotizaciones del vehículo sobre la lista agrupada, y un vehículo que no es un id no abre nada', async ({
  page,
}) => {
  await abrir(page, deLaPrueba(`&panel=cotizaciones-del-vehiculo&vehiculo=${grupo.vehiculoId}`))
  const modal = modalDelGrupo(page)
  await expect(modal.locator('[data-linea-del-grupo]')).toHaveCount(4)
  // `?vehiculo=` es del modal, no el filtro: la lista de atrás sigue agrupada y entera (la ven los dos conteos aunque el modal la oculte al lector).
  await expect(page.locator('[data-conteo-del-grupo]')).toHaveCount(2)
  await expect(page.getByText(/sin agrupar/)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  await page.goto(deLaPrueba('&panel=cotizaciones-del-vehiculo&vehiculo=hilux'))
  await expect(page.locator('tbody tr, article').first()).toBeVisible()
  await expect(modalDelGrupo(page)).toHaveCount(0)
  await expect.poll(() => panelDe(page)).toBeNull()
})

test('E2E en el celular el modal del vehículo ocupa toda la pantalla', async ({ page }, info) => {
  await abrir(page, deLaPrueba())
  await page.getByRole('button', { name: '4 cotizaciones de este vehículo' }).click()
  const modal = modalDelGrupo(page)
  await expect(modal).toBeVisible()
  const marco = page.viewportSize()
  if (info.project.name === 'movil') {
    // Al abrir crece de 95 % a 100 % (`zoom-in-95`): se mide cuando terminó.
    await expect
      .poll(async () => {
        const caja = await modal.boundingBox()
        return [Math.round(caja?.width ?? 0), Math.round(caja?.height ?? 0)]
      })
      .toEqual([marco?.width, marco?.height])
  } else {
    // En escritorio es un diálogo con margen.
    const caja = await modal.boundingBox()
    expect(caja?.width ?? 0).toBeLessThan(marco?.width ?? 0)
  }
  await capturar(page, info, 'modal-del-vehiculo-pantalla')
})

test('E2E «Compartir» de la tarjeta abre su panel y el «⋯» de la tarjeta no lo repite', async ({
  page,
}) => {
  await abrir(page, deLaPrueba())
  const tarjeta = tarjetaDe(page, suelta)
  await tarjeta.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('panel')).toBe('compartir')
  expect(new URL(page.url()).searchParams.get('para')).toBe(suelta)
  const panel = page.getByRole('dialog', { name: 'Compartir cotización' })
  await expect(panel.getByRole('button', { name: 'Copiar texto' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await tarjeta.getByRole('button', { name: /^Más acciones de N\.º \d+$/ }).click()
  await expect(page.getByRole('menuitem').first()).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Compartir cotización/ })).toHaveCount(0)
})

// @sin-celular: la tabla sólo existe en escritorio; en el celular la lista siempre va en tarjetas
test('E2E en la tabla, el «⋯» trae «Compartir cotización…» primero y está la columna «Título»', async ({
  page,
}, info) => {
  await abrir(page, deLaPrueba('&vista=tabla&agrupar=no'))
  await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible()
  await capturar(page, info, 'tabla-sin-agrupar')
  const fila = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /^Abrir N\.º/ }) })
    .first()
  await fila.getByRole('button', { name: /^Más acciones de N\.º \d+$/ }).click()
  await expect(page.getByRole('menuitem').first()).toHaveText('Compartir cotización…')
})

// @sin-celular: «Tabla | Tarjetas» se elige sólo en escritorio; en el celular no hay nada que elegir
test('E2E «Tabla | Tarjetas» y «Agrupar por vehículo» se recuerdan al volver', async ({ page }) => {
  await abrir(page, deLaPrueba())
  await page.getByRole('button', { name: /^Vista y opciones/ }).click()
  await page.getByRole('button', { name: 'Tabla', exact: true }).click()
  await expect(page).toHaveURL(/vista=tabla/)
  await page.getByRole('switch', { name: 'Agrupar por vehículo' }).click()
  await expect(page).toHaveURL(/agrupar=no/)
  // Las dos quedaron guardadas en la cuenta: sin nada en la URL, la tabla y sin agrupar.
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.preferencias_usuario where usuario_id = ${literal(idDePersona(t.duena))}::uuid and clave in ('cotizaciones.vista', 'cotizaciones.agrupar')`,
      ).trim(),
    )
    .toBe('2')
  await page.goto(deLaPrueba())
  await expect(page.getByRole('columnheader', { name: 'Título' })).toBeVisible()
  await expect(conteo(page)).toHaveCount(0)
  sql(
    `delete from public.preferencias_usuario where usuario_id = ${literal(idDePersona(t.duena))}::uuid and clave like 'cotizaciones.%'`,
  )
})

test('E2E «Mías» deja en el grupo sólo las suyas y el conteo baja', async ({ page }) => {
  await abrir(page, deLaPrueba('&cuales=mias'))
  await expect(page.getByRole('button', { name: '3 cotizaciones de este vehículo' })).toBeVisible()
})

test('E2E todas las tarjetas miden lo mismo', async ({ page }, info) => {
  await abrir(page, deLaPrueba())
  const tarjetas = page.locator('article')
  await expect(tarjetas).toHaveCount(3)
  await expect
    .poll(async () => {
      const altos = await tarjetas.evaluateAll((todas) =>
        todas.map((una) => una.getBoundingClientRect().height),
      )
      return Math.max(...altos) - Math.min(...altos)
    })
    .toBeLessThanOrEqual(1)
  // Para mirar (`E2E_CAPTURAS`): con el texto al 200 %.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await capturar(page, info, 'tarjetas-al-200')
})

test('E2E el clic en la imagen no abre el resumen y el de la tarjeta sí; el visor de la tarjeta es suyo', async ({
  page,
}) => {
  await abrir(page, deLaPrueba())
  const tarjeta = tarjetaDe(page, suelta)
  // La imagen abre su visor recién al hidratar (antes, el clic no hace nada): se insiste hasta que abre, sin volver a pulsar con
  // el visor ya pedido. Abierto tapa la lista: se cierra antes del clic en la tarjeta.
  const visor = page.getByRole('dialog', { name: /^Imagen de la tarjeta de la cotización/ })
  await expect(async () => {
    if (!page.url().includes(`visor=imagen-de-la-lista-${suelta}`))
      await tarjeta.locator('[data-imagen-de-la-tarjeta]').click({ position: { x: 10, y: 10 } })
    await expect(visor).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(page).not.toHaveURL(/cotizacion=/)
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await tarjeta.locator('[data-autor-de-la-cotizacion]').click()
  await expect(page).toHaveURL(new RegExp(`cotizacion=${suelta}`))
})

test('E2E en Modo Live la tarjeta ofrece «Compartir» y la imagen va sin moneda', async ({
  page,
}, info) => {
  await entrar(page, t.duena, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(deLaPrueba())
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  await expect(page.locator('article').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Compartir', exact: true }).filter({ visible: true }).first(),
  ).toBeVisible()
  await expect(
    page.locator('article').first().locator('img[data-imagen-moneda="sin"]'),
  ).toBeVisible({ timeout: 30_000 })
  await capturar(page, info, 'tarjetas-en-modo-live')
})
