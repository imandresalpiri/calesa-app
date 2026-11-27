// @sin-celular-archivo: el buscador de Configuración por sus enlaces; el celular lo revisa la IA con capturas
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sql } from './soporte/sql'

// Configuración no tiene Catálogos (`docs/DECISIONES.md` › «Cada catálogo vive en el área que lo usa; Configuración no tiene Catálogos»): el buscador de
// Configuración encuentra cada catálogo donde vive: los de logística, en el drawer de la pestaña Fases de cada origen («Orígenes › <origen> › Fases › Puertos»);
// los tipos de documento del flujo de repuestos, en el suyo. Las tablas de referencia viven en el drawer de cada origen y no son un destino del buscador.

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-buscador-catalogos-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Catálogos' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

test('E2E el buscador encuentra cada catálogo donde vive', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const buscador = page.getByRole('searchbox', { name: 'Buscar en Configuración' })
  const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  const id = sql("select id from public.origenes where clave = 'subasta_usa'")
  const fases = `Orígenes › ${sql(`select nombre from public.origenes where id = '${id}'`)} › Fases`
  const enFases = `/configuracion/origenes/${id}/fases?panel=`
  const casos: [texto: string, camino: string, href: string][] = [
    ['colores', 'Orígenes › Colores', '/configuracion/origenes?panel=colores'],
    ['vigencia', 'Orígenes › Vigencia', '/configuracion/origenes?panel=vigencia'],
    [
      'niveles de acceso',
      'Roles y permisos › Niveles de acceso',
      '/configuracion/roles?bloque=cotizaciones',
    ],
    [
      'quién crea',
      'Roles y permisos › Quién crea y quién ve',
      '/configuracion/roles?bloque=cotizaciones',
    ],
    // Con el nombre del origen: hay uno por origen y la lista tiene tope.
    ['puertos subasta', `${fases} › Puertos`, `${enFases}puertos`],
    ['navieras subasta', `${fases} › Navieras`, `${enFases}navieras`],
    ['categorías subasta', `${fases} › Categorías de gasto`, `${enFases}categorias-de-gasto`],
    ['tipos de documento subasta', `${fases} › Tipos de documento`, `${enFases}tipos-de-documento`],
    [
      'tipos de documento repuestos',
      'Repuestos › Flujo de repuestos › Tipos de documento',
      '/repuestos/configuracion/flujo?panel=tipos-de-documento',
    ],
    ['flujo de repuestos', 'Repuestos › Flujo de repuestos', '/repuestos/configuracion/flujo'],
    [
      'cotizador de repuestos',
      'Repuestos › Cotizador de repuestos',
      '/repuestos/configuracion/cotizador',
    ],
    [
      'catálogos de repuestos',
      'Repuestos › Catálogos de repuestos',
      '/repuestos/configuracion/catalogos',
    ],
  ]
  for (const [texto, camino, href] of casos) {
    await buscador.fill(texto)
    const enlace = resultados.getByRole('link', { name: camino, exact: true })
    await expect(enlace, camino).toHaveAttribute('href', href)
  }
  await buscador.fill('catálogos')
  await expect(resultados.getByRole('link', { name: /^Catálogos$/ })).toHaveCount(0)
  await buscador.fill('tablas compartidas')
  await expect(resultados.getByRole('link', { name: 'Orígenes › Tablas compartidas' })).toHaveCount(
    0,
  )
})
