import { expect, test, type Browser, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  enlaceDelCorreo,
  rolesDe,
} from './soporte/base'
import {
  ajustesGuardados,
  editarTarjeta,
  esperarEdicionApagada,
  estadoDeApibara,
  pedirSecreto,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  ultimoCambioDe,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { vigilarVaultDeApibara } from './soporte/apibara-clave'
import { ingresar } from './soporte/pasos'

// Configuración › Empresa contra la app compilada y el Supabase local. La empresa es una fila
// única: antes de empezar se guarda cómo estaba y al terminar se deja exactamente así, para el
// spec que sigue en la misma corrida.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const CAMBISTA = 'Carla Cambios'
const MOTIVO_SIN_PERMISO =
  'Puedes ver los ajustes de la empresa, pero no tienes permiso para cambiarlos.'

let duena = ''
let cambista = ''
let proyecto = ''
let antes: InstantaneaDeEmpresa
// La clave de apibara en Vault: al terminar el spec tiene que quedar como estaba, con su huella (9-8).
const vault = vigilarVaultDeApibara()

test.beforeAll(async ({}, info) => {
  vault.empezar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  proyecto = info.project.name
  duena = correoDePrueba(`duena-empresa-${proyecto}`)
  cambista = correoDePrueba(`cambista-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  // Alguien que gestiona los tipos de cambio y nada más de la empresa.
  await crearPersona({ email: cambista, contrasena: CLAVE, nombre: CAMBISTA, invitada: true })
  await darRolDePrueba({
    email: cambista,
    rol: { nombre: `${PREFIJO_ROL_E2E}Cambios ${proyecto}`, clave: `e2e_cambios_${proyecto}` },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
})

test.afterAll(async () => {
  vault.dejarComoEstaba()
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  vault.verificar()
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

test('la dueña cambia el nombre y la zona horaria y se ven en el shell', async ({
  page,
  isMobile,
}) => {
  const nombre = `Importadora Andina ${proyecto}`
  await entrar(page, duena)

  // Llega por su menú: Configuración → Empresa.
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Configuración' }).click()
  await page.getByRole('region').getByRole('link', { name: 'Empresa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Datos de la empresa', level: 1 })).toBeVisible()

  const identidad = await editarTarjeta(page, 'Identidad')
  await identidad.getByLabel('Nombre de la empresa').fill(nombre)
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(identidad).toBeHidden()

  // La región, en su propio modal: el código de país, con la forma de un código o vacío.
  const region = await editarTarjeta(page, 'Región')
  await region.getByLabel('Zona horaria').fill('Asia/Tokyo')
  await region.getByLabel('Código de país de los teléfonos').fill('54')
  await region.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(region.getByText('El código de país lleva un «+» y de 1 a 3 dígitos.')).toBeVisible()
  await expect(region.getByLabel('Código de país de los teléfonos')).toHaveValue('54')
  await region.getByLabel('Código de país de los teléfonos').fill('+54')
  await region.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(region).toBeHidden()

  // El nombre, en la marca del marco: la barra lateral en escritorio, el menú en el celular.
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    await expect(page.getByRole('dialog').getByText(nombre)).toBeVisible()
    await page.keyboard.press('Escape')
    // Mientras el menú se va, la barra superior ya se ve y el menú aún tiene su copia del botón: el clic de abajo
    // vería dos «Tipos de cambio» (visto en la corrida del 5a-fix-3: el clic salió 1 ms después del Escape).
    await expect(page.getByRole('dialog')).toBeHidden()
  } else {
    await expect(page.getByRole('complementary').getByText(nombre)).toBeVisible()
  }

  // La zona horaria, en la barra superior: las horas de los tipos de cambio se muestran en ella.
  await page.getByRole('button', { name: 'Tipos de cambio' }).click()
  await expect(page.getByText('Las horas están en Asia/Tokyo.')).toBeVisible()
  await page.keyboard.press('Escape')

  // Lo que quedó en la base.
  expect(await ajustesGuardados()).toMatchObject({
    nombre,
    zona_horaria: 'Asia/Tokyo',
    telefono_cc: '+54',
  })

  // Una zona que no existe se rechaza con el motivo, y lo tipeado queda.
  const otraVez = await editarTarjeta(page, 'Región')
  await otraVez.getByLabel('Zona horaria').fill('Marte/Olympus')
  await otraVez.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(otraVez.getByText('Esa zona horaria no existe')).toBeVisible()
  await expect(otraVez.getByLabel('Zona horaria')).toHaveValue('Marte/Olympus')
  // Y el foco va al campo con error: guardando el formulario estaba deshabilitado.
  await expect(otraVez.getByLabel('Zona horaria')).toBeFocused()
  expect((await ajustesGuardados()).zona_horaria).toBe('Asia/Tokyo')
})

test('edita un tipo de cambio y aparece en la barra superior y en el historial', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/monedas')
  await expect(page.getByRole('heading', { name: 'USD a BOB', exact: true })).toBeVisible()
  const enLaBarra = page.getByRole('button', { name: 'Tipos de cambio' })
  await expect(enLaBarra).toContainText('11,68')

  // Tocar el tipo de cambio abre su panel, con el valor listo para cambiar.
  await page.getByRole('button', { name: /^Abrir Oficial/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Oficial' })).toBeVisible()
  await panel.getByLabel(/^Valor/).fill('7,13')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tipo de cambio «Oficial» guardado')).toBeVisible()

  // El historial del panel dice de cuánto a cuánto y quién.
  const cambio = panel.getByRole('listitem').filter({ hasText: '7,13' }).first()
  await expect(cambio).toContainText('11,68')
  await expect(cambio).toContainText(DUENA)
  expect(await ultimoCambioDe('oficial')).toMatchObject({
    valor_anterior: 11.68,
    valor_nuevo: 7.13,
  })

  // Y la barra superior muestra el valor nuevo, sin recargar.
  await panel.getByRole('button', { name: 'Cerrar' }).first().click()
  await expect(panel).toBeHidden()
  await expect(enLaBarra).toContainText('7,13')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin el permiso de ajustes, Datos de la empresa sale deshabilitada con el motivo', async ({
  page,
  browser,
}) => {
  await page.goto('/ingreso')
  const suya = await otraPersona(browser, page)
  await entrar(suya, cambista)

  // La sección aparece en su Configuración: tiene uno de los dos permisos de la empresa.
  await suya.goto('/configuracion/inicio')
  await suya.getByRole('region').getByRole('link', { name: 'Empresa', exact: true }).click()
  await expect(suya.getByText(MOTIVO_SIN_PERMISO)).toBeVisible()
  for (const titulo of ['Identidad', 'Región', 'Datos legales y de contacto', 'Políticas']) {
    await esperarEdicionApagada(suya, titulo)
  }
  // Un `?panel=` a mano no abre el modal: se avisa y se limpia.
  await suya.goto('/configuracion/empresa?panel=identidad')
  await expect(suya.getByRole('dialog')).toBeHidden()
  await expect(suya).toHaveURL('/configuracion/empresa')

  // Lo que sí gestiona, lo edita: los tipos de cambio, en su sub-ruta.
  const menu = suya.getByRole('navigation', { name: 'Secciones de Configuración' })
  await menu.getByRole('link', { name: 'Monedas y tipos de cambio' }).click()
  await expect(suya).toHaveURL('/configuracion/empresa/monedas')
  await expect(suya.getByRole('button', { name: /^Nuevo tipo de cambio/ }).first()).toBeVisible()
  await suya.context().close()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('guarda la clave de apibara sin volver a mostrarla, y recién entonces la activa', async ({
  page,
}) => {
  test.skip(vault.hayClaveReal, 'hay una clave real de apibara: guardar otra la pisaría (9-8)')
  const secreto = `e2e-clave-${proyecto}-0123456789`
  await entrar(page, duena)
  await page.goto('/configuracion/empresa/integraciones')

  // Sin clave guardada no se puede activar, y se dice por qué. La web pública tiene su propio
  // «Activa»: el de apibara es el de su tarjeta.
  const tarjeta = page.getByRole('region', { name: 'apibara', exact: true })
  const activa = tarjeta.getByRole('switch', { name: 'Activa' })
  await expect(activa).toHaveAttribute('data-disabled', '')
  await expect(page.getByText('Guarda la clave antes de activarla.')).toBeVisible()
  const alMenu = async (accion: string) => {
    await tarjeta.getByRole('button', { name: 'Más acciones de apibara' }).click()
    await page.getByRole('menuitem', { name: accion }).click()
  }

  // La clave es su propia escritura, en su modal.
  await alMenu('Cargar la clave')
  const claveModal = page.getByRole('dialog', { name: 'Cargar la clave' })
  await claveModal.getByLabel('Clave', { exact: true }).fill(secreto)
  await claveModal.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Clave de apibara guardada')).toBeVisible()
  await expect(claveModal).toBeHidden()

  // Queda dicho que está guardada; la clave no vuelve, ni a la vista ni en lo que manda el servidor.
  await expect(tarjeta.getByText(/Guardada el /)).toBeVisible()
  await expect(tarjeta.getByText('No se puede ver: sólo reemplazar.')).toBeVisible()
  expect(await page.content()).not.toContain(secreto)
  await alMenu('Reemplazar la clave')
  const reemplazo = page.getByRole('dialog', { name: 'Reemplazar la clave' })
  await expect(reemplazo.getByLabel('Clave nueva')).toHaveValue('')
  await reemplazo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(reemplazo).toBeHidden()

  // Con la clave en Vault, ahora sí. Encender el interruptor guarda al instante.
  await activa.click()
  await expect(page.getByText('apibara activada')).toBeVisible()
  await expect(activa).toBeChecked()

  // La dirección no puede apuntar fuera de apibara.tech: ahí viaja la clave.
  await alMenu('Configurar')
  const configurar = page.getByRole('dialog', { name: 'Configurar apibara' })
  await configurar.getByLabel('Dirección del servicio').fill('https://atacante.example')
  await configurar.getByRole('button', { name: 'Guardar', exact: true }).click()
  // El error, no la ayuda: las dos dicen «ser de apibara.tech».
  await expect(page.locator('#endpoint-error')).toContainText('ser de apibara.tech')
  expect(await estadoDeApibara()).toEqual({ activa: true, conSecreto: true })
  await configurar.getByLabel('Dirección del servicio').fill('https://api.apibara.tech/v2')
  await configurar.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Configuración de apibara guardada')).toBeVisible()
  await expect(configurar).toBeHidden()
  await expect(tarjeta.getByText('https://api.apibara.tech/v2')).toBeVisible()

  // Contra la base real: ni quien la guardó ni alguien sin sesión pueden pedir la clave.
  const rechazo = { codigo: '42501', dato: null }
  expect(await pedirSecreto({ email: duena, contrasena: CLAVE })).toEqual(rechazo)
  expect(await pedirSecreto()).toEqual(rechazo)

  await page.reload()
  await expect(activa).toBeChecked()
  expect(await page.content()).not.toContain(secreto)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin conexión, el formulario avisa y conserva lo tipeado', async ({ page, context }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  const legales = await editarTarjeta(page, 'Datos legales y de contacto')
  await legales.getByLabel('Razón social').fill('Andina SRL')

  await context.setOffline(true)
  await expect(legales.getByText('No hay conexión. Puedes seguir escribiendo')).toBeVisible()
  await legales.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(legales.getByText(/Lo que escribiste sigue acá/)).toBeVisible()
  await expect(legales.getByLabel('Razón social')).toHaveValue('Andina SRL')

  // Vuelve la conexión: el mismo modal, con lo mismo, se guarda solo.
  await context.setOffline(false)
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(legales).toBeHidden()

  // Lo tipeado y no guardado sobrevive a recargar la pantalla, y se puede descartar.
  const otra = await editarTarjeta(page, 'Datos legales y de contacto')
  await otra.getByLabel('NIT').fill('1020304050')
  await expect(otra.getByLabel('NIT')).toHaveValue('1020304050')
  page.once('dialog', (dialogo) => void dialogo.accept())
  await page.reload()
  const recuperada = page.getByRole('dialog', { name: 'Datos legales y de contacto' })
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(recuperada.getByLabel('NIT')).toHaveValue('1020304050')
  await expect(recuperada.getByLabel('Razón social')).toHaveValue('Andina SRL')
  await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Descartar' }).click()
  await expect(recuperada.getByLabel('NIT')).toHaveValue('')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la dueña abre el registro y otra persona crea su cuenta y entra, sin rol', async ({
  page,
  browser,
}) => {
  const nueva = correoDePrueba(`registrada-${proyecto}`)
  await entrar(page, duena)

  // Con el registro cerrado y el equipo ya creado, la pantalla de ingreso no ofrece crear cuenta.
  const suya = await otraPersona(browser, page)
  await suya.goto('/ingreso')
  await expect(suya.getByRole('link', { name: 'Crear cuenta' })).toBeHidden()

  await page.goto('/configuracion/empresa')
  const politicas = await editarTarjeta(page, 'Políticas')
  await politicas.getByRole('switch', { name: 'Registro abierto' }).click()
  await politicas.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()

  // Ahora sí: se registra, confirma su correo y queda adentro, sin ningún rol.
  await suya.reload()
  await suya.getByRole('link', { name: 'Crear cuenta' }).click()
  await suya.getByLabel('Nombre y apellido').fill('Nora Nueva')
  await suya.getByLabel('Correo').fill(nueva)
  await suya.getByLabel('Contraseña').fill(CLAVE)
  await suya.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(suya).toHaveURL('/ingreso?aviso=confirmar_correo')
  await suya.goto(await enlaceDelCorreo(nueva))
  await expect(suya).toHaveURL('/')
  expect(await rolesDe(nueva)).toEqual([])
  await suya.context().close()
})
