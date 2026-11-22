import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  abrirElMenu,
  casillasEnOrden,
  elegirDelMenu,
  filaDelCampo,
  lineaApagada,
} from './soporte/editor-de-campos'
import { descartarAviso } from './soporte/inventario'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { expect, test } from './soporte/prueba'
import { agregarCampo } from './soporte/vehiculos'

// @sin-celular-archivo: Configuración › Orígenes no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// Los datos clave de un origen en «Campos»: el enlace viejo `?seccion=campos` lleva a la sub-ruta; un origen manual nace con los 4 de
// fábrica (Año, Kilometraje, VIN, Categoría) y «Hacer dato clave» de un campo se apaga con el tope a la vista; quitar uno, hacer dato clave
// el campo y subirlo se guardan al instante, sobreviven a recargar y quedan así en la base; desactivar el campo lo saca. El permiso, la versión, los
// topes y la limpieza los prueba `supabase/tests/areas/origenes/datos-clave.sql`; la carrera, `carreras.mjs`.
test.describe.configure({ mode: 'serial' })

const COLOR = 'Color e2e'
const TOPE = 'Ya hay 4 datos clave: quita uno para sumar este.'

let proyecto = ''
let claveDeOrigen = ''
let duena = ''
let origen: { id: string; nombre: string }

async function datosClaveDeLaBase(id: string): Promise<unknown> {
  const { data, error } = await admin()
    .from('origenes')
    .select('datos_clave')
    .eq('id', id)
    .limit(1)
    .single<{ datos_clave: unknown }>()
  if (error) {
    throw new Error(`No se pudo leer el origen: ${error.message}`)
  }
  return data.datos_clave
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDeOrigen = `datos_clave_${proyecto}`
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-datos-clave-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Clave' })
  origen = await crearOrigenDePrueba(`Datos clave ${proyecto}`, claveDeOrigen)
  await agregarCampo(origen.id, { clave: 'color_e2e', etiqueta: COLOR, tipo: 'texto' })
})

test.afterAll(async () => {
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: elegir, ordenar y quitar los datos clave de un origen se guarda al instante', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })

  // El enlace de antes lleva a la sub-ruta; el origen nació con los 4 de fábrica de un manual.
  await page.goto(`/configuracion/origenes/${origen.id}?seccion=campos`)
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${origen.id}/campos$`))
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  expect(await casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', 'VIN', 'Categoría'])

  // Con 4, «Hacer dato clave» del campo se apaga con el motivo a la vista.
  await expect(page.getByText(TOPE).first()).toBeVisible()
  await lineaApagada(page, COLOR, 'Hacer dato clave')

  // Quitar VIN deja 3; hacer dato clave el campo lo suma al final; subirlo lo deja tercero. Cada cambio espera al anterior.
  await elegirDelMenu(page, 'VIN en los datos clave', 'Quitar de los datos clave')
  await expect(page.getByRole('heading', { name: 'Datos clave (3 de 4)', level: 2 })).toBeVisible()
  await elegirDelMenu(page, COLOR, 'Hacer dato clave')
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  await expect(filaDelCampo(page, COLOR)).toContainText('Dato clave')
  expect(await casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', 'Categoría', COLOR])
  await elegirDelMenu(page, `${COLOR} en los datos clave`, 'Subir')
  await expect.poll(() => casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', COLOR, 'Categoría'])

  // Queda así en la base y sobrevive a recargar.
  await expect
    .poll(() => datosClaveDeLaBase(origen.id))
    .toEqual([
      { comun: 'anio' },
      { comun: 'kilometraje' },
      { campo: 'color_e2e' },
      { comun: 'categoria_id' },
    ])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Datos clave (4 de 4)', level: 2 })).toBeVisible()
  expect(await casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', COLOR, 'Categoría'])

  // Desactivar el campo lo saca de los datos clave en la misma llamada (el «⋯» lo avisa).
  await abrirElMenu(page, COLOR)
  await expect(page.getByText('También sale de los datos clave.')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click()
  await descartarAviso(page, `«${COLOR}» desactivado`)
  await expect(page.getByRole('heading', { name: 'Datos clave (3 de 4)', level: 2 })).toBeVisible()
  expect(await casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', 'Categoría'])
  await expect
    .poll(() => datosClaveDeLaBase(origen.id))
    .toEqual([{ comun: 'anio' }, { comun: 'kilometraje' }, { comun: 'categoria_id' }])
})
