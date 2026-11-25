// @sin-celular-archivo: pantalla de Configuración; en el celular se recorre con la IA y capturas descritas en el PR
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { guardarConElAtajo, tarjetaGuardada } from './soporte/cotizar-guardar'
import { escribirElTitulo } from './soporte/cotizar-titulo'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  a1De,
  celdaDe,
  entradaDeLaCelda,
  escribirEnLaCelda,
  grilla,
  guardado,
  guardar,
  menuDeLaFila,
  planilla,
} from './soporte/planilla'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// La puesta en marcha de un origen nuevo (`docs/UX.md` › «Puesta en marcha»): de «Nuevo origen» a «Cotizar con <origen>», paso por paso (Campos con los de
// fábrica, Flujo copiado de un origen de la semilla, una fórmula en blanco con tres filas, la tarjeta por omisión y Publicar), salir a mitad y retomarla
// desde la cabecera de la página del origen.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let lead = ''
let nombre = ''
let origenId = ''

const urlDelPaso = (paso: string) =>
  new RegExp(`/configuracion/origenes/[0-9a-f-]{36}/puesta-en-marcha/${paso}$`)

function borrarElOrigen(): void {
  const delOrigen = `(select id from public.origenes where nombre = ${literal(nombre)})`
  sql(`
    delete from public.cotizaciones where origen_id in ${delOrigen};
    delete from public.vehiculos where origen_id in ${delOrigen};
    delete from public.origenes where nombre = ${literal(nombre)}`)
}

async function seguir(page: Page, hacia: string, etiqueta = 'Seguir') {
  await page.getByRole('link', { name: etiqueta, exact: true }).click()
  await expect(page).toHaveURL(urlDelPaso(hacia))
}

// La fila nueva abre su concepto: se nombra, se escribe su fórmula en C y devuelve su id.
async function insertarArribaDelTotal(page: Page, concepto: string, formula: string) {
  await menuDeLaFila(page, 'total')
  await page.getByRole('menuitem', { name: /^Insertar arriba/ }).click()
  await expect(entradaDeLaCelda(page)).toBeFocused()
  await entradaDeLaCelda(page).pressSequentially(concepto)
  await entradaDeLaCelda(page).press('Enter')
  await expect(entradaDeLaCelda(page)).toBeHidden()
  const fila = grilla(page).locator('tr[data-fila]').filter({ hasText: concepto })
  await expect(fila).toHaveCount(1)
  const id = (await fila.getAttribute('data-fila')) ?? ''
  await escribirEnLaCelda(page, celdaDe(page, id), formula)
  return id
}

// Sin bandas, el total necesita filas con su tipo de cambio: una banda con las dos filas.
async function unaBandaCon(page: Page, filas: string[]) {
  await planilla(page).getByRole('button', { name: 'Más acciones de la planilla' }).click()
  await page.getByRole('menuitem', { name: /^Nueva banda/ }).click()
  const banda = page.getByRole('dialog', { name: 'Nueva banda' })
  await banda.getByLabel('Etiqueta', { exact: true }).fill('Costo')
  await banda.getByLabel('Tipo de cambio', { exact: true }).selectOption('tc')
  for (const fila of filas) {
    await banda.getByLabel('Sumar una fila', { exact: true }).selectOption(fila)
    await banda.getByRole('button', { name: 'Sumar', exact: true }).click()
  }
  await banda.getByRole('button', { name: 'Crear banda', exact: true }).click()
  await expect(banda).toBeHidden()
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  nombre = `Asistente ${proyecto}`
  borrarElOrigen()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-asistente-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Ada Asistente' })
  lead = await crearLead({
    nombre: `asistente ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
})

test.afterAll(async () => {
  borrarElOrigen()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
})

test('E2E escritorio · poner en marcha un origen nuevo y cotizar con él', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/origenes')
  await page.getByRole('link', { name: 'Nuevo origen' }).click()
  await expect(page).toHaveURL(/\/configuracion\/origenes\/nuevo$/)
  await expect(page.getByRole('heading', { name: 'Nuevo origen', level: 1 })).toBeVisible()
  const alta = page.locator('main')
  await alta.getByLabel('Nombre', { exact: true }).fill(nombre)
  await alta.getByRole('button', { name: 'Crear origen' }).click()

  // 2. Campos: los de fábrica de un origen manual alcanzan.
  await expect(page).toHaveURL(urlDelPaso('campos'))
  origenId = new URL(page.url()).pathname.split('/')[3] ?? ''
  const pasos = page.getByRole('navigation', { name: 'Pasos de la puesta en marcha' })
  await expect(pasos.getByRole('listitem').filter({ hasText: 'Datos' })).toContainText('Hecho')
  await seguir(page, 'flujo')

  // 3. Flujo: nace sin fases; se empieza con las de un origen de la semilla.
  await page.getByRole('button', { name: 'Empezar con las fases de…' }).click()
  const copiar = page.getByRole('dialog', { name: 'Empezar con las fases de…' })
  await copiar.getByLabel('Origen').selectOption({ label: 'Oficina' })
  await copiar.getByRole('button', { name: 'Copiar las fases' }).click()
  await expect(copiar).toBeHidden()
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = ${literal(origenId)}::uuid`,
      ),
    )
    .toBe('3')
  await expect(page).toHaveURL(urlDelPaso('flujo'))
  await expect(pasos.getByRole('listitem').filter({ hasText: 'Flujo' })).toContainText('Hecho')

  // 8. Salir a mitad: la página del origen dice qué falta (el ⚠ de su pestaña) y retoma donde quedó.
  await page.goto(`/configuracion/origenes/${origenId}/campos`)
  await expect(
    page.getByRole('tab', { name: 'Planilla. Sin fórmula activa: no se puede cotizar' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Seguir la puesta en marcha' }).click()
  await expect(page).toHaveURL(urlDelPaso('formula'))

  // 4. Fórmula: en blanco, con dos filas sobre el total.
  await page.getByRole('button', { name: 'Empezar en blanco' }).click()
  const nueva = page.getByRole('dialog', { name: 'Nueva fórmula' })
  await expect(nueva.getByLabel('Nombre', { exact: true })).toHaveValue(nombre)
  await nueva.getByRole('button', { name: 'Crear fórmula' }).click()
  await expect(nueva).toBeHidden()
  await expect(grilla(page)).toBeVisible()
  const precio = await insertarArribaDelTotal(page, 'Precio', '=800+200')
  const flete = await insertarArribaDelTotal(page, 'Flete', '=250*2')
  await unaBandaCon(page, [precio, flete])
  const suma = `=${await a1De(page, precio)}+${await a1De(page, flete)}`
  await escribirEnLaCelda(page, celdaDe(page, 'total'), suma)
  await guardar(page).click()
  await expect(guardado(page)).toHaveText('Se guardó el borrador.')
  await seguir(page, 'tarjeta')

  // 5. Tarjeta: la por omisión, hasta que la planilla esté publicada.
  await expect(page.getByText(/La fórmula trae la tarjeta por omisión\./)).toBeVisible()
  await seguir(page, 'publicar', 'Ir a publicar')

  // 6. Publicar: activa la fórmula con su nota.
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const activar = page.getByRole('dialog', { name: `Activar «${nombre}»` })
  await activar.getByLabel('Nota', { exact: true }).fill('Primera versión')
  await activar.getByRole('button', { name: `Activar «${nombre}»` }).click()
  await expect(page).toHaveURL(urlDelPaso('listo'))
  await expect(page.getByText(`${nombre} ya cotiza.`)).toBeVisible()

  // 7. Cotizar con él: la hoja del origen, con el lead y un vehículo del origen, hasta guardar.
  await page.getByRole('link', { name: `Cotizar con ${nombre}` }).click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/nuevo\\?origen=${origenId}$`))
  const titulo = `E2E asistente ${proyecto}`
  await cargarVehiculos(origenId, [{ titulo, anio: 2021 }])
  const vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}&lead=${lead}&vehiculo=${vehiculo}`)
  await escribirElTitulo(page, titulo)
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(
    sql(
      `select total_base::numeric > 0 from public.cotizaciones where origen_id = ${literal(origenId)}::uuid and vehiculo_id = ${literal(vehiculo)}::uuid`,
    ),
  ).toBe('t')
})
