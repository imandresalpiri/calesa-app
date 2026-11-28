// Lo que necesita `artes-editor-con-datos.spec.ts`: la plantilla de arte con un texto con variables, la foto 1 y la tarjeta de la cotización; los
// vehículos de la subasta de la semilla (con o sin VIN) y su limpieza; y lo que dibuja el lienzo, leído de los `Stage` de Konva.
import { BASE_DE_CAPA } from './artes-editor'
import type { Page } from './prueba'
import { literal, sql } from './sql'

// El texto arriba, la foto 1 en el medio y la tarjeta de la cotización abajo (un formato vertical de 1080 × 1350).
export function capasConDatos(texto: string): Record<string, unknown>[] {
  const marco = { radio: 0, borde: null, grosor: 0 }
  return [
    {
      ...BASE_DE_CAPA,
      id: 'texto-1',
      tipo: 'texto',
      x: 80,
      y: 60,
      ancho: 920,
      alto: 160,
      texto,
      fuente: 'geist',
      tamano: 48,
      peso: 700,
      interlineado: 1.2,
      color: '#111111',
      alineacion: 'izquierda',
      borde: null,
      grosor: 0,
    },
    {
      ...BASE_DE_CAPA,
      ...marco,
      id: 'foto-1',
      tipo: 'foto',
      x: 80,
      y: 260,
      ancho: 920,
      alto: 520,
      indice: 0,
      ajuste: 'cubrir',
      foco: { x: 0.5, y: 0.5 },
    },
    {
      ...BASE_DE_CAPA,
      ...marco,
      id: 'tarjeta-1',
      tipo: 'tarjeta',
      x: 80,
      y: 820,
      ancho: 600,
      alto: 400,
    },
  ]
}

export function crearVehiculoConVin(origenId: string, titulo: string, vin: string | null): string {
  return sql(`
    insert into public.vehiculos (origen_id, titulo, vin)
      values (${literal(origenId)}::uuid, ${literal(titulo)}, ${vin === null ? 'null' : literal(vin)})
      returning id`)
}

// Los vehículos por su título, con sus cotizaciones y sus filas de fotos (los objetos de Storage los borra `borrarFotosDe()`).
export function borrarVehiculosPorTitulo(titulos: readonly string[]): void {
  const lista = titulos.map((titulo) => literal(titulo)).join(', ')
  const ids = `select id from public.vehiculos where titulo in (${lista})`
  sql(`
    delete from public.cotizaciones where vehiculo_id in (${ids});
    delete from public.vehiculos_imagenes where vehiculo_id in (${ids});
    delete from public.vehiculos where titulo in (${lista});`)
}

type NodoDeKonva = {
  isVisible: () => boolean
  text?: () => string
  image?: () => { src?: string } | undefined
}
type Konva = {
  stages: { find: (tipo: string) => NodoDeKonva[]; container: () => HTMLElement }[]
}

// Los textos visibles del lienzo, de `window.Konva` (donde lo buscan sus herramientas y las pruebas de navegador). Sólo el `Stage` del lienzo:
// las miniaturas de la tira de páginas de un PDF son otros.
export const textosDelLienzo = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    (window as unknown as { Konva: Konva }).Konva.stages
      .filter((stage) => stage.container().closest('section[aria-label="Lienzo"]') !== null)
      .flatMap((stage) =>
        stage
          .find('Text')
          .filter((nodo) => nodo.isVisible())
          .map((nodo) => nodo.text?.() ?? ''),
      ),
  )

// La ruta (sin el origen) de cada imagen visible del lienzo que ya tiene su archivo (sólo el `Stage` del lienzo).
export const imagenesDelLienzo = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    (window as unknown as { Konva: Konva }).Konva.stages
      .filter((stage) => stage.container().closest('section[aria-label="Lienzo"]') !== null)
      .flatMap((stage) =>
        stage
          .find('Image')
          .filter((nodo) => nodo.isVisible())
          .map((nodo) => nodo.image?.()?.src ?? '')
          .filter((src) => src !== '')
          .map((src) => new URL(src).pathname),
      ),
  )
