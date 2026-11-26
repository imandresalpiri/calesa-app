import { expect, test, type Page } from './soporte/prueba'
import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { idDe } from './soporte/leads'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La actividad legible (`docs/UX.md` › «Actividad»): cada cambio como frase con el registro enlazado y su antes → después, el detalle en su
// drawer (`?cambio=`), los chips de persona y tipo de registro, «Ver más» y la «Actividad reciente» de un registro. El
// terreno: un vehículo con 25 cambios de título de Carlos y, el más nuevo, uno de precio de la dueña, escritos directo en `actividad` (la
// frase sale de lo que devuelve `actividad_listar`; el recorte y la visibilidad los prueba `supabase/tests/areas/actividad/listar.sql`).
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar: () => Promise<void>
let vehiculo = { id: '', numero: '', titulo: '' }
let precio = ''
let elMasViejo = ''
let carlos = ''

const ruta = () => `/actividad?entidad=vehiculos&registro=${vehiculo.id}`
const filas = (page: Page) => page.locator('li[id^="cambio-"]')
const fila = (page: Page, id: string) => page.locator(`li#cambio-${id}`)

test.beforeAll(async ({}, info) => {
  const alta = await prepararAlta(info.project.name)
  personas = alta.personas
  restaurar = alta.restaurarCatalogos
  const duena = await idDe(personas.duena)
  carlos = await idDe(personas.carlos)
  const titulo = `E2E Actividad legible ${info.project.name}`
  const [id = '', numero = ''] = sql(`
    insert into public.vehiculos (origen_id, titulo)
    select o.id, ${literal(titulo)} from public.origenes o where o.clave = 'subasta_usa'
    returning id || '|' || numero;`).split('|')
  vehiculo = { id, numero, titulo }
  elMasViejo = sql(`
    with x as (
      insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
      select 'vehiculos.update', ${literal(carlos)}, 'vehiculos', ${literal(id)},
             jsonb_build_object('titulo', 'Título ' || g), jsonb_build_object('titulo', 'Título ' || (g + 1))
        from generate_series(1, 25) g order by g
      returning id)
    select min(id) from x;`)
  precio = sql(`
    insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues)
    values ('vehiculos.update', ${literal(duena)}, 'vehiculos', ${literal(id)}, '{"precio": 10000}', '{"precio": 12000}')
    returning id;`)
})

test.afterAll(async () => {
  if (vehiculo.id !== '') {
    sql(`delete from public.vehiculos where id = ${literal(vehiculo.id)};
         delete from public.actividad where tabla = 'vehiculos' and registro_id = ${literal(vehiculo.id)};`)
  }
  await limpiarAlta(restaurar)
})

test('E2E un cambio de precio se lee como frase y despliega su detalle en la fila', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  await page.goto(ruta())
  await expect(page.getByRole('heading', { name: 'Hoy', level: 2 })).toBeVisible()
  const cambio = fila(page, precio)
  await expect(cambio).toContainText(
    new RegExp(
      `^Dalia Alta cambió Precio de ${vehiculo.titulo} #${vehiculo.numero}: .*10.000.* → .*12.000`,
    ),
  )
  await expect(
    cambio.getByRole('link', { name: `${vehiculo.titulo} #${vehiculo.numero}` }),
  ).toHaveAttribute('href', `/vehiculos/${vehiculo.id}`)
  await capturar(page, info, 'frases')

  const verDetalle = cambio.getByRole('button', { name: 'Ver detalle' })
  await expect(verDetalle).toHaveAttribute('aria-haspopup', 'dialog')
  const alto = (await cambio.boundingBox())?.height
  await verDetalle.click()
  await expect(page).toHaveURL(new RegExp(`[?&]cambio=${precio}`))
  const detalle = page.getByRole('dialog', { name: 'Detalle del cambio' })
  await expect(detalle.getByRole('term')).toHaveText(['Precio'])
  await expect(detalle.getByRole('definition')).toContainText(/Antes.*10.000/)
  await expect(detalle.getByRole('definition')).toContainText(/Después.*12.000/)
  await capturar(page, info, 'detalle')

  // La fila no cambia de alto al abrirse su detalle, y al cerrar el foco vuelve a «Ver detalle».
  expect((await cambio.boundingBox())?.height).toBe(alto)
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()
  await expect(page).not.toHaveURL(/[?&]cambio=/)
  await expect(verDetalle).toBeFocused()
})

test('E2E ?cambio= abre su drawer, también el de un cambio que no está cargado', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  await page.goto(`${ruta()}&cambio=${precio}`)
  const detalle = page.getByRole('dialog', { name: 'Detalle del cambio' })
  await expect(detalle.getByRole('term')).toHaveText(['Precio'])

  // El más viejo no está en la primera página: el mismo drawer, con la frase arriba; la lista sigue detrás.
  await page.goto(`${ruta()}&cambio=${elMasViejo}`)
  await expect(detalle.getByRole('term')).toHaveText(['Título'])
  await expect(detalle).toContainText('Carlos Alta Prueba cambió')
  await expect(filas(page)).toHaveCount(20)
  await capturar(page, info, 'el-cambio-fuera-de-lo-cargado')
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()

  await page.goto(`${ruta()}&cambio=no-es-un-id`)
  await expect(detalle.getByText('No tienes acceso a este cambio.')).toBeVisible()
})

test('E2E «Ver más» carga la página siguiente', async ({ page }) => {
  await entrar(page, personas.duena)
  await page.goto(ruta())
  // El alta del vehículo, los 25 cambios de título y el de precio: 27, de a 20.
  await expect(filas(page)).toHaveCount(20)
  await page.getByRole('button', { name: 'Ver más' }).click()
  await expect(filas(page)).toHaveCount(27)
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
})

test('E2E los chips de persona y de tipo de registro filtran y se quitan', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  await page.goto(ruta())
  await expect(page.getByRole('button', { name: 'Quitar el filtro del registro' })).toContainText(
    `Registro: ${vehiculo.titulo} #${vehiculo.numero}`,
  )

  await page
    .getByRole('combobox', { name: 'Persona', exact: true })
    .selectOption({ label: 'Carlos Alta Prueba' })
  await expect(page).toHaveURL(new RegExp(`[?&]persona=${carlos}`))
  await expect(fila(page, precio)).toHaveCount(0)
  await expect(filas(page)).toHaveCount(20)
  await expect(filas(page).first()).toContainText('Carlos Alta Prueba cambió Título de')
  await capturar(page, info, 'chips')
  await page.getByRole('button', { name: 'Quitar el filtro Persona: Carlos Alta Prueba' }).click()
  await expect(page).not.toHaveURL(/[?&]persona=/)
  await expect(fila(page, precio)).toBeVisible()

  await page.getByRole('button', { name: 'Quitar el filtro del registro' }).click()
  await expect(page).not.toHaveURL(/[?&]registro=/)
  await page
    .getByRole('combobox', { name: 'Tipo de registro', exact: true })
    .selectOption({ label: 'Lead' })
  await expect(page).toHaveURL(/[?&]entidad=leads/)
  await expect(fila(page, precio)).toHaveCount(0)
  await page.getByRole('button', { name: 'Quitar el filtro Tipo de registro: Lead' }).click()
  await expect(page).not.toHaveURL(/[?&]entidad=/)
})

test('E2E la actividad reciente de un registro dibuja sus 5 últimos cambios y lleva a toda su actividad', async ({
  page,
}, info) => {
  await entrar(page, personas.duena)
  await page.goto(`/actividad/reciente?entidad=vehiculos&registro=${vehiculo.id}`)
  const reciente = page.getByRole('region', { name: 'Actividad reciente' })
  const enlaces = reciente.getByRole('listitem').getByRole('link')
  await expect(enlaces).toHaveCount(5)
  await expect(enlaces.first()).toContainText('Dalia Alta cambió Precio de')
  await expect(enlaces.first()).toHaveAttribute(
    'href',
    `/actividad?entidad=vehiculos&registro=${vehiculo.id}&cambio=${precio}`,
  )
  await capturar(page, info, 'actividad-reciente')
  await reciente.getByRole('link', { name: 'Ver toda la actividad' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/actividad\\?entidad=vehiculos&registro=${vehiculo.id}$`),
  )
  await expect(fila(page, precio)).toBeVisible()
})
