// @sin-celular-archivo: el logo y los íconos se eligen igual en el celular; la marca del marco en celular la recorre el primer caso de empresa.spec.ts, que corre en los dos anchos
import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  ajustesGuardados,
  editarTarjeta,
  esperarEdicionApagada,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// El logo y los íconos de la app (Configuración › Empresa) contra la app compilada y el Supabase local. La empresa es una fila única: se
// guarda cómo estaba y al terminar se deja exactamente así.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
// Sólo `viewBox`, sin ancho ni alto: el caso que hay que saber dibujar.
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#0b7285"/><circle cx="30" cy="30" r="14" fill="#fff"/></svg>'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-iconos-${info.project.name}`)
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

type Manifest = { name: string; icons: { src: string; purpose?: string }[] }

test('carga el logo al guardar, regenera los íconos y el manifest los sirve', async ({
  page,
  request,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')

  // Sin logo no hay de dónde dibujarlos: la tarjeta de íconos no abre y dice por qué.
  const tarjetaDeIconos = page.getByRole('region', { name: 'Íconos de la app', exact: true })
  await esperarEdicionApagada(page, 'Íconos de la app')
  await expect(tarjetaDeIconos.getByText('Carga el logo y guarda')).toBeVisible()

  const identidad = await editarTarjeta(page, 'Identidad')
  const selector = identidad.getByLabel('Elegir el logo de la empresa')

  // Un formato que no sirve se rechaza al elegirlo, con el motivo.
  await selector.setInputFiles({
    name: 'logo.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  })
  await expect(identidad.getByText('El logo tiene que ser SVG, PNG, WebP o JPEG.')).toBeVisible()

  // Elegir uno válido sólo lo muestra: todavía no hay nada en la base.
  await selector.setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(LOGO_SVG),
  })
  await expect(identidad.getByRole('button', { name: 'Cambiar logo', exact: true })).toBeVisible()
  expect((await ajustesGuardados()).logo_ruta).toBeNull()

  // Si el logo no sube, la fila no se guarda.
  await page.route('**/storage/v1/object/marca/**', (ruta) => ruta.abort())
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(identidad.getByText('No se pudo subir el archivo')).toBeVisible()
  expect((await ajustesGuardados()).logo_ruta).toBeNull()
  await page.unroute('**/storage/v1/object/marca/**')

  // Ahora sí: se sube al guardar, junto con el nombre que el manifest dirá.
  await identidad.getByLabel('Nombre de la empresa').fill('Importadora Andina')
  await identidad.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  await expect(identidad).toBeHidden()
  expect((await ajustesGuardados()).logo_ruta).toMatch(/^logos\/[0-9a-f]{64}\.svg$/)

  // Con logo, los íconos se dibujan en su modal y se muestran; recién al guardar se suben y se guardan.
  const iconos = await editarTarjeta(page, 'Íconos de la app')
  await iconos.getByText('Blanco', { exact: true }).click()
  await iconos.getByRole('button', { name: 'Dibujar los íconos' }).click()
  await expect(iconos.getByLabel('Vista previa de los íconos')).toBeVisible()
  expect((await ajustesGuardados()).iconos).toBeNull()
  await iconos.getByRole('button', { name: 'Guardar íconos' }).click()
  await expect(page.getByText('Íconos de la app guardados')).toBeVisible()
  expect(Object.keys((await ajustesGuardados()).iconos ?? {}).sort()).toEqual([
    '180',
    '192',
    '32',
    '512',
    '512m',
  ])

  // El manifest (que se pide sin sesión) trae el nombre de la empresa y los íconos de Storage.
  const manifest = (await (await request.get('/manifest.webmanifest')).json()) as Manifest
  expect(manifest.name).toContain('Importadora Andina')
  expect(manifest.icons).toHaveLength(3)
  for (const icono of manifest.icons) {
    expect(icono.src).toContain('/storage/v1/object/public/marca/iconos/')
    const respuesta = await request.get(icono.src)
    expect(respuesta.headers()['content-type']).toBe('image/png')
  }
  expect(manifest.icons.filter((icono) => icono.purpose === 'maskable')).toHaveLength(1)

  // Y el <link rel="icon"> del documento redirige al generado.
  const vigente = await request.get('/iconos/vigente/32', { maxRedirects: 0 })
  expect(vigente.status()).toBe(307)
  expect(vigente.headers()['location']).toContain('/marca/iconos/')

  // Volver a los neutros deja el manifest como al instalar.
  await page
    .getByRole('region', { name: 'Íconos de la app', exact: true })
    .getByRole('button', { name: 'Más acciones de Íconos de la app' })
    .click()
  await page.getByRole('menuitem', { name: 'Volver a los íconos neutros' }).click()
  await expect(page.getByText('La app vuelve a usar los íconos neutros')).toBeVisible()
  const neutro = (await (await request.get('/manifest.webmanifest')).json()) as Manifest
  expect(neutro.icons[0]?.src).toBe('/iconos/icono-192.png')
})
