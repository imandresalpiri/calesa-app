import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { quieto } from './soporte/esperas'
import { literal, sql } from './soporte/sql'

// Enlaces de ayuda (docs/GLOSARIO.md): la empresa los prepara en Configuración › Empresa, cada persona los ve en «Ayuda» del menú del perfil y elige
// en Perfil cuáles ver, en qué orden, y suma los suyos, que nadie más ve. Aquí el camino feliz de punta a punta, el vacío con su acción, `?panel=ayuda`
// por la URL, y que el cuerpo del modal mide lo mismo cargando, con la lista y sin red.
test.describe.configure({ mode: 'serial' })

const MANUAL = { titulo: 'Manual de ventas', url: 'https://manual.ejemplo.com/ventas' }
const GLOSARIO = { titulo: 'Glosario de aduana', url: 'https://aduana.ejemplo.com' }
const PROPIO = { titulo: 'Mi tablero de notas', url: 'https://notas.ejemplo.com/mias' }

const personas = { duena: '', bruno: '', carla: '' }
const NOMBRES = { duena: 'Dora Ayuda', bruno: 'Bruno Ayuda', carla: 'Carla Ayuda' }

function borrarEnlaces() {
  sql('delete from public.enlaces_de_ayuda_personales; delete from public.enlaces_de_ayuda;')
}

function sembrarEnlacesDeLaEmpresa() {
  borrarEnlaces()
  sql(
    `insert into public.enlaces_de_ayuda (id, titulo, url, orden) values
       (gen_random_uuid(), ${literal(MANUAL.titulo)}, ${literal(MANUAL.url)}, 1),
       (gen_random_uuid(), ${literal(GLOSARIO.titulo)}, ${literal(GLOSARIO.url)}, 2)`,
  )
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  borrarEnlaces()
  const p = info.project.name
  personas.duena = correoDePrueba(`duena-ayuda-${p}`)
  personas.bruno = correoDePrueba(`bruno-ayuda-${p}`)
  personas.carla = correoDePrueba(`carla-ayuda-${p}`)
  await crearDuenaDePrueba({ email: personas.duena, contrasena: CONTRASENA, nombre: NOMBRES.duena })
  for (const quien of ['bruno', 'carla'] as const) {
    await crearPersona({
      email: personas[quien],
      contrasena: CONTRASENA,
      nombre: NOMBRES[quien],
      invitada: true,
    })
    await darRolDePrueba({
      email: personas[quien],
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Ayuda ${quien} ${p}`,
        clave: `e2e_ayuda_${quien}_${p.replaceAll(/[^a-z0-9]/g, '_')}`,
      },
      permisos: ['leads.crear'],
    })
  }
})

test.afterAll(async () => {
  borrarEnlaces()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Abre «Ayuda» desde el avatar y devuelve el modal.
async function abrirAyuda(page: Page, nombre: string): Promise<Locator> {
  await page.getByRole('button', { name: `Menú de ${nombre}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Ayuda', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Ayuda', exact: true })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/[?&]panel=ayuda(&|$)/)
  return modal
}

// Los títulos de los enlaces del modal, en su orden.
async function titulosDelMenu(modal: Locator): Promise<string[]> {
  const enlaces = modal.getByRole('list', { name: 'Enlaces de ayuda' }).getByRole('link')
  return (await enlaces.evaluateAll((todos) =>
    todos.map((a) => a.querySelector('span span')?.textContent ?? ''),
  )) as string[]
}

const enlaceDelMenu = (modal: Locator, titulo: string) =>
  modal.getByRole('link', { name: new RegExp(`^${titulo}, en .+ \\(se abre en otra pestaña\\)$`) })

// @sin-celular: crear los de la empresa es una pantalla de Configuración, que no se prueba en el celular (e2e.md)
test('E2E escritorio: la empresa crea dos enlaces de ayuda en Configuración › Empresa', async ({
  page,
}) => {
  borrarEnlaces()
  await entrar(page, personas.duena, { fresco: true })
  await page.goto('/configuracion/empresa')
  const tarjeta = page.getByRole('region', { name: 'Enlaces de ayuda', exact: true })
  await expect(tarjeta).toBeVisible()
  await tarjeta.getByRole('button', { name: 'Editar Enlaces de ayuda', exact: true }).click()
  const lista = page.getByRole('dialog', { name: 'Enlaces de ayuda', exact: true })
  await expect(lista).toBeVisible()
  await expect(page).toHaveURL(/panel=enlaces-de-ayuda/)

  for (const enlace of [MANUAL, GLOSARIO]) {
    await lista.getByRole('button', { name: 'Nuevo enlace', exact: true }).click()
    const nuevo = page.getByRole('dialog', { name: 'Nuevo enlace', exact: true })
    await expect(nuevo).toBeVisible()
    await nuevo.getByLabel('Título').fill(enlace.titulo)
    // Una dirección sin https:// se rechaza junto al campo, con lo tipeado intacto.
    await nuevo.getByLabel('Dirección').fill(enlace.url.replace('https://', 'http://'))
    await nuevo.getByRole('button', { name: 'Crear enlace', exact: true }).click()
    await expect(nuevo.getByText('Escribe una dirección que empiece con https://.')).toBeVisible()
    await expect(nuevo.getByLabel('Título')).toHaveValue(enlace.titulo)
    await nuevo.getByLabel('Dirección').fill(enlace.url)
    await nuevo.getByRole('button', { name: 'Crear enlace', exact: true }).click()
    await expect(nuevo).toBeHidden()
    await expect(lista).toBeVisible()
    await expect(lista.getByText(enlace.titulo, { exact: true })).toBeVisible()
  }
  await expect
    .poll(() => sql("select string_agg(titulo, '|' order by orden) from public.enlaces_de_ayuda"))
    .toBe(`${MANUAL.titulo}|${GLOSARIO.titulo}`)
  await lista.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await expect(lista).toBeHidden()
  await expect(tarjeta).toContainText('2 enlaces')
})

test('E2E: una persona los ve desde el avatar, oculta uno, reordena y suma uno propio en Perfil', async ({
  page,
}) => {
  sembrarEnlacesDeLaEmpresa()
  await entrar(page, personas.bruno, { fresco: true })
  await page.goto('/notificaciones')
  const ayuda = await abrirAyuda(page, NOMBRES.bruno)
  await expect(enlaceDelMenu(ayuda, MANUAL.titulo)).toHaveAttribute('target', '_blank')
  await expect(enlaceDelMenu(ayuda, MANUAL.titulo)).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(ayuda.getByText('manual.ejemplo.com', { exact: true })).toBeVisible()
  expect(await titulosDelMenu(ayuda)).toEqual([MANUAL.titulo, GLOSARIO.titulo])

  // «Elegir mis enlaces» lleva al modal de Perfil.
  await ayuda.getByRole('link', { name: 'Elegir mis enlaces', exact: true }).click()
  await expect(page).toHaveURL(/\/perfil\?panel=enlaces-de-ayuda$/)
  const mios = page.getByRole('dialog', { name: 'Mis enlaces de ayuda', exact: true })
  await expect(mios).toBeVisible()
  const fila = (titulo: string) => mios.getByRole('listitem').filter({ hasText: titulo })

  // Ocultar el manual (guarda al instante).
  await fila(MANUAL.titulo).getByRole('switch', { name: 'Mostrar' }).click()
  await expect(fila(MANUAL.titulo).getByRole('switch', { name: 'Mostrar' })).not.toBeChecked()
  await expect(page.getByText(`«${MANUAL.titulo}» ya no se ve en tu menú.`)).toBeVisible()

  // Subir el glosario: el foco vuelve a su «⋯».
  const masDelGlosario = fila(GLOSARIO.titulo).getByRole('button', {
    name: `Más acciones de ${GLOSARIO.titulo}`,
  })
  await masDelGlosario.click()
  await page.getByRole('menuitem', { name: 'Subir', exact: true }).click()
  await expect(mios.getByRole('listitem').first()).toContainText(GLOSARIO.titulo)
  await expect(masDelGlosario).toBeFocused()

  // Uno propio, al final.
  await mios.getByRole('button', { name: 'Agregar enlace propio', exact: true }).click()
  const propio = page.getByRole('dialog', { name: 'Agregar enlace propio', exact: true })
  await expect(propio).toBeVisible()
  await propio.getByLabel('Título').fill(PROPIO.titulo)
  await propio.getByLabel('Dirección').fill(PROPIO.url)
  await propio.getByRole('button', { name: 'Agregar enlace', exact: true }).click()
  await expect(propio).toBeHidden()
  await expect(mios).toBeVisible()
  await expect(mios.getByRole('listitem').last()).toContainText(PROPIO.titulo)
  await mios.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await expect(mios).toBeHidden()
  await expect(page.getByRole('region', { name: 'Ayuda', exact: true })).toContainText(
    PROPIO.titulo,
  )

  // El menú refleja lo elegido: sin el manual, el glosario arriba y el propio al final.
  const otraVez = await abrirAyuda(page, NOMBRES.bruno)
  await expect(enlaceDelMenu(otraVez, PROPIO.titulo)).toBeVisible()
  expect(await titulosDelMenu(otraVez)).toEqual([GLOSARIO.titulo, PROPIO.titulo])
})

test('E2E: otra persona no ve el enlace propio de nadie y ve los de la empresa en su orden', async ({
  page,
}) => {
  await entrar(page, personas.carla, { fresco: true })
  await page.goto('/notificaciones')
  const ayuda = await abrirAyuda(page, NOMBRES.carla)
  await expect(enlaceDelMenu(ayuda, MANUAL.titulo)).toBeVisible()
  expect(await titulosDelMenu(ayuda)).toEqual([MANUAL.titulo, GLOSARIO.titulo])
  await expect(ayuda.getByText(PROPIO.titulo)).toHaveCount(0)
})

test('E2E: sin enlaces y sin el permiso, el vacío ofrece agregar uno propio', async ({ page }) => {
  borrarEnlaces()
  await entrar(page, personas.carla, { fresco: true })
  // `?panel=ayuda` por la URL abre el modal sin pasar por el menú.
  await page.goto('/notificaciones?panel=ayuda')
  const ayuda = page.getByRole('dialog', { name: 'Ayuda', exact: true })
  await expect(ayuda.getByText('Todavía no hay enlaces de ayuda.')).toBeVisible()
  await expect(ayuda.getByRole('link', { name: 'Agregar en Configuración' })).toHaveCount(0)
  await ayuda.getByRole('link', { name: 'Agregar uno propio', exact: true }).click()
  await expect(page).toHaveURL(/\/perfil\?panel=nuevo-enlace-propio$/)
  await expect(
    page.getByRole('dialog', { name: 'Agregar enlace propio', exact: true }),
  ).toBeVisible()
})

test('E2E: sin enlaces, quien prepara los de la empresa va a Configuración desde el vacío', async ({
  page,
}) => {
  borrarEnlaces()
  await entrar(page, personas.duena, { fresco: true })
  await page.goto('/notificaciones?panel=ayuda')
  const deLaDuena = page.getByRole('dialog', { name: 'Ayuda', exact: true })
  await deLaDuena.getByRole('link', { name: 'Agregar en Configuración', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/empresa\?panel=enlaces-de-ayuda$/)
  await expect(page.getByRole('dialog', { name: 'Enlaces de ayuda', exact: true })).toBeVisible()
})

test('E2E: el cuerpo de «Ayuda» mide lo mismo cargando, con la lista y sin red', async ({
  page,
}) => {
  sembrarEnlacesDeLaEmpresa()
  await entrar(page, personas.carla, { fresco: true })
  await page.goto('/notificaciones')
  // La primera lectura queda en vuelo hasta soltarla: se mide el esqueleto.
  let soltar = () => {}
  const enVuelo = new Promise<void>((listo) => {
    soltar = listo
  })
  let pedidos = 0
  await page.route('**/rest/v1/rpc/enlaces_de_ayuda_de_mi', async (ruta) => {
    pedidos += 1
    if (pedidos === 1) {
      await enVuelo
      await ruta.fallback()
      return
    }
    if (pedidos === 2) {
      await ruta.abort('internetdisconnected')
      return
    }
    await ruta.fallback()
  })
  const ayuda = await abrirAyuda(page, NOMBRES.carla)
  const cuerpo = ayuda.locator('[data-cuerpo-de-ayuda]')
  await expect(cuerpo.getByRole('status', { name: 'Cargando los enlaces de ayuda' })).toBeVisible()
  await quieto(ayuda)
  const cargando = await cuerpo.boundingBox()
  soltar()
  await expect(enlaceDelMenu(ayuda, MANUAL.titulo)).toBeVisible()
  const conLista = await cuerpo.boundingBox()
  expect(conLista?.height).toBe(cargando?.height)

  // Se cierra y se vuelve a abrir: esta vez falla la red.
  await page.keyboard.press('Escape')
  await expect(ayuda).toBeHidden()
  const otra = await abrirAyuda(page, NOMBRES.carla)
  await expect(otra.getByText('No se pudieron cargar los enlaces')).toBeVisible()
  await quieto(otra)
  const sinRed = await otra.locator('[data-cuerpo-de-ayuda]').boundingBox()
  expect(sinRed?.height).toBe(cargando?.height)
  await otra.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(enlaceDelMenu(otra, GLOSARIO.titulo)).toBeVisible()
})
