// Lo que los e2e de los catálogos de logística en la pestaña Fases de cada origen (`?panel=puertos|navieras|categorias-de-gasto|tipos-de-documento`)
// preparan y miran. Todo lo que crean lleva este prefijo en el nombre: es lo único que la limpieza borra.
import type { Locator, Page } from '@playwright/test'
import { literal, sql } from './sql'

export const PREFIJO_T570 = 'E2E T570'

export function origenPorClave(clave: string): { id: string; nombre: string } {
  const [id = '', ...nombre] = sql(
    `select id || '|' || nombre from public.origenes where clave = ${literal(clave)}`,
  ).split('|')
  return { id, nombre: nombre.join('|') }
}

export const urlDelCatalogo = (origenId: string, panel: string, consulta = '') =>
  `/configuracion/origenes/${origenId}/fases?panel=${panel}${consulta}`

// El drawer de un catálogo, por su título.
export const drawerDe = (page: Page, titulo: string): Locator =>
  page.getByRole('dialog', { name: titulo })

// Un grupo del drawer de un catálogo de logística: «De <origen>» (`origen`) o los compartidos, por su título.
export const grupoDe = (
  page: Page,
  prefijo: 'puerto' | 'naviera' | 'categoria-de-gasto' | 'tipos',
  grupo: 'origen' | 'compartido',
): Locator => page.locator(`section[aria-labelledby="titulo-de-${prefijo}-${grupo}"]`)

// Los botones de los catálogos, arriba del diagrama.
export const botonesDeLosCatalogos = (page: Page): Locator =>
  page.getByRole('group', { name: 'Catálogos' }).getByRole('button')

export function borrarCatalogosT570(): void {
  const como = `like ${literal(`${PREFIJO_T570}%`)}`
  sql(`
    delete from public.flujos_transporte_oferta
     where naviera_id in (select id from public.navieras where nombre ${como})
        or puerto_id in (select id from public.puertos where nombre ${como});
    delete from public.navieras where nombre ${como};
    delete from public.puertos where nombre ${como};
    delete from public.categorias_gasto where nombre ${como};
    delete from public.fases_requisitos
     where tipo_documento_id in (select id from public.tipos_documento where nombre ${como});
    delete from public.tipos_documento where nombre ${como};
  `)
}

export function idDelTipo(nombre: string): string {
  return sql(`select id from public.tipos_documento where nombre = ${literal(nombre)}`)
}
