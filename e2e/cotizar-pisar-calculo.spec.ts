import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { numeroDeLaCotizacion } from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  guardarConElAtajo,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import {
  CALCULADA,
  PISADA,
  PISADA_A_LA_VISTA,
  PORCENTAJE_PISADO,
  aviso,
  borrarLoDeEsteSpec,
  calculado,
  crearOrigenConLaTransferenciaDeCostos,
  marca,
  monto,
  pisarLaTransferencia,
  porcentaje,
} from './soporte/cotizar-pisar'
import {
  abrirLaHoja,
  abrirLaVistaPrevia,
  alDia,
  resumen,
  urlDeLaSubasta,
} from './soporte/cotizar-vista-previa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { elegirEnElMenu } from './soporte/menu-de-la-guardada'
import { sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// Pisar un cálculo al cotizar (`docs/COTIZADOR.md` › «Pisar un cálculo», `docs/UX.md` › «Cotización: hoja (estados propios)»): sobre cualquier cálculo con celda
// se escribe si el nivel lo deja; la celda dice «Editado a mano» y lo calculado, la primera pisada de la hoja avisa una vez y ↺ vuelve al calculado. En la hoja
// de la subasta de la semilla: la transferencia (un `porcentaje_de` que no es sobrescribible) se vuelve par al pisar el monto y su porcentaje sale de lo escrito.
test.describe.configure({ mode: 'serial' })

let duena = ''
let sinNivel = ''
let subasta = ''
let lead = ''
let vehiculo = ''
let origenConNivel = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  borrarLoDeEsteSpec('')
  duena = correoDePrueba(`duena-pisar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pía Pisa' })
  sinNivel = correoDePrueba(`sin-nivel-pisar-${proyecto}`)
  await crearPersona({
    email: sinNivel,
    contrasena: CONTRASENA,
    nombre: 'Saúl Sin',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinNivel,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Pisar sin nivel ${proyecto}`,
      clave: `e2e_pisar_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  lead = await crearLead({
    nombre: `pisar ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  const titulo = `Pisar Corolla ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  origenConNivel = await crearOrigenConLaTransferenciaDeCostos(proyecto)
})

test.afterAll(async () => {
  borrarLoDeEsteSpec(vehiculo)
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const abrir = (page: Page, extra = '') =>
  abrirLaHoja(page, duena, `${urlDeLaSubasta(subasta, lead, vehiculo)}${extra}`)

test('E2E pisar el monto de la transferencia: el porcentaje sale de lo escrito, la celda lo dice, el aviso sale una vez y ↺ vuelve al calculado', async ({
  page,
}) => {
  await abrir(page)
  const transferencia = await pisarLaTransferencia(page)
  await expect(monto(transferencia)).toContainText(PISADA_A_LA_VISTA)
  await expect(porcentaje(transferencia)).toContainText(PORCENTAJE_PISADO)
  await expect(marca(transferencia)).toBeVisible()
  await expect(calculado(transferencia)).toContainText(CALCULADA)
  await expect(aviso(page)).toHaveCount(1)
  await expect(aviso(page)).toContainText(
    'Pisaste un cálculo: queda fijo aunque cambien los datos.',
  )

  await transferencia.getByRole('button', { name: /^Volver al calculado/ }).click()
  await alDia(page)
  await expect(monto(transferencia)).toContainText(CALCULADA)
  await expect(porcentaje(transferencia)).toContainText(/4\s?%/)
  await expect(marca(transferencia)).toHaveCount(0)
  await expect(calculado(transferencia)).toHaveCount(0)

  // Cerrado, no vuelve en la misma hoja: pisar otra vez no es la primera.
  await page.getByRole('button', { name: 'Cerrar el aviso' }).click()
  await expect(aviso(page)).toHaveCount(0)
  await tipearEnLaHoja(page, 'transferencia', PISADA)
  await alDia(page)
  await expect(marca(transferencia)).toBeVisible()
  await expect(aviso(page)).toHaveCount(0)
})

test('E2E con la transferencia pisada, otro remate deja el monto y recalcula el porcentaje y lo calculado', async ({
  page,
}) => {
  await abrir(page)
  const transferencia = await pisarLaTransferencia(page)
  // 20.000 de remate y 2.600 de fees: 474,60 es el 2,1 % y lo calculado, 904.
  await tipearEnLaHoja(page, 'remate', '20000')
  await alDia(page)
  await expect(monto(transferencia)).toContainText(PISADA_A_LA_VISTA)
  await expect(porcentaje(transferencia)).toContainText(/2,1\s?%/)
  await expect(calculado(transferencia)).toContainText('904,00')
  await expect(marca(transferencia)).toBeVisible()
})

test('E2E pisar el FOB de «Avanzado» recalcula lo que depende de él y el total', async ({
  page,
}) => {
  await abrir(page, '&panel=avanzado')
  await expect(page.getByRole('dialog', { name: 'Avanzado' })).toBeVisible()
  // Valor tabla 20.000 por el factor 0,328 del 2020: el FOB da 6.560 y el seguro (2 % del FOB), 131,20.
  await tipearEnLaHoja(page, 'valor_tabla', '20000')
  await alDia(page)
  const seguro = celdaDeLaHoja(page, 'seguro')
  await expect(monto(seguro)).toContainText('131,20')
  const antes = (await totalDeLaHoja(page).textContent()) ?? ''
  await tipearEnLaHoja(page, 'fob', '10000')
  await alDia(page)
  await expect(monto(seguro)).toContainText('200,00')
  await expect(marca(celdaDeLaHoja(page, 'fob'))).toBeVisible()
  await expect(calculado(celdaDeLaHoja(page, 'fob'))).toContainText('6.560,00')
  await expect(totalDeLaHoja(page)).not.toHaveText(antes)
})

test('E2E quien no tiene el nivel ve la transferencia con su candado y su motivo; el cálculo sin nivel lo pisa', async ({
  page,
}) => {
  await abrirLaHoja(page, sinNivel, `/cotizaciones/nuevo?origen=${origenConNivel}`)
  const transferencia = celdaDeLaHoja(page, 'transferencia')
  await expect(monto(transferencia)).toHaveAttribute('aria-disabled', 'true')
  await expect(
    transferencia.getByRole('img', { name: 'Lo edita quien tiene el nivel «Costos».' }),
  ).toBeVisible()
  await expect(monto(celdaDeLaHoja(page, 'fees'))).not.toHaveAttribute('aria-disabled')
})

test('E2E guardar la pisada: la guardada la marca, el resumen la lista y la revisión dice de cuánto a cuánto', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  await tipearEnLaHoja(page, 'remate', '10000')
  await alDia(page)
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const id = guardados.pedidos[0]?.intento ?? ''
  expect(id, 'el guardado de la hoja nueva').not.toBe('')

  await page.goto(`/cotizaciones/${id}`)
  await tipearEnLaHoja(page, 'transferencia', PISADA)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()

  await page.reload()
  const transferencia = celdaDeLaHoja(page, 'transferencia')
  await expect(marca(transferencia)).toBeVisible()
  await expect(calculado(transferencia)).toContainText(CALCULADA)
  const pisadas = resumen(page).locator('[data-pisadas]')
  await expect(pisadas).toContainText('Editado a mano: Transferencia a USA')
  await expect(pisadas).toContainText(new RegExp(`${PISADA_A_LA_VISTA}.*calculado.*${CALCULADA}`))

  await elegirEnElMenu(page, 'Revisiones')
  const panel = page.getByRole('dialog', {
    name: `Revisiones de la cotización n.º ${numeroDeLaCotizacion(id)}`,
  })
  await expect(panel.getByRole('listitem').first()).toContainText(
    new RegExp(`Pisó «Transferencia a USA»: .*${CALCULADA}.*→.*${PISADA_A_LA_VISTA}`),
  )
})

test('E2E la tarjeta de la vista previa dice el porcentaje que sale de lo pisado, sin la marca', async ({
  page,
}) => {
  await abrir(page)
  await pisarLaTransferencia(page)
  const tarjeta = await abrirLaVistaPrevia(page)
  await expect(tarjeta.locator('[data-celda="c_n_transferencia_leyenda"]')).toHaveText(
    /Comisión giro 4,2\s?%/,
  )
  await expect(tarjeta).toContainText(PISADA_A_LA_VISTA)
  await expect(tarjeta.getByText(/Editado a mano|Calculado:/)).toHaveCount(0)
  await expect(marca(tarjeta)).toHaveCount(0)
})
