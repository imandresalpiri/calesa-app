// Los bloques de la derecha de la ficha de un vehículo (docs/UX.md › Vehículo), en el orden de su índice: sólo lo de ventas. Cada uno se dibuja sólo
// con su permiso y, si no está, tampoco sale en el índice (sin ninguno, la derecha queda vacía y sin índice). La vitrina no es un bloque: se publica desde el
// panel «Publicar en la web…» (`?panel=vitrina`) y se ve en el ícono de la foto. Lo que es de logística y de repuestos va por los enlaces cortos de la
// cabecera. Lo leen el servidor (la página) y el test: nada de cliente acá.
import { puede, type Permisos } from '@/shared/lib/permisos'

export const BLOQUES_DE_LA_FICHA = [
  {
    ancla: 'cotizaciones',
    etiqueta: 'Cotizaciones',
    titulo: 'Cotizaciones de este vehículo',
  },
  { ancla: 'relacionados', etiqueta: 'Relacionados', titulo: 'Relacionados' },
  { ancla: 'actividad', etiqueta: 'Actividad', titulo: 'Actividad reciente' },
] as const

export type AnclaDeLaFicha = (typeof BLOQUES_DE_LA_FICHA)[number]['ancla']
export type BloqueDeLaFicha = (typeof BLOQUES_DE_LA_FICHA)[number]

// El parámetro de los enlaces de siempre (`?seccion=cotizaciones`): lleva a su bloque.
export const CLAVE_DE_SECCION = 'seccion'

// El drawer «Ver todos» de un grupo de «Relacionados» (`?relacionados=<tipo>`; la misma clave que `CLAVE_DE_RELACIONADOS` de `vehiculos`, que vive en
// un hook de cliente y no se importa en el servidor).
export const CLAVE_DE_RELACIONADOS = 'relacionados'

// Los paneles de «Relacionados» que se abren por la URL: llegar con uno lleva a ese bloque.
const PANELES_DE_RELACIONADOS: readonly string[] = [
  'desvincular',
  'vincular-lead',
  'marcar-interesado',
]

type Puertas = Record<AnclaDeLaFicha, boolean>

// Lo que decide cada bloque: «Cotizaciones de este vehículo», `cotizaciones.ver` del origen; «Relacionados», `leads.ver`; «Actividad reciente»,
// `actividad.ver` (global).
function puertasDe(permisos: Permisos, origenId: string): Puertas {
  return {
    cotizaciones: puede(permisos, 'cotizaciones.ver', origenId),
    relacionados: puede(permisos, 'leads.ver'),
    actividad: puede(permisos, 'actividad.ver'),
  }
}

/** Los bloques que ve quien tiene esos permisos en el origen del vehículo, en el orden del índice. */
export function bloquesDeQuienMira(permisos: Permisos, origenId: string): BloqueDeLaFicha[] {
  const puertas = puertasDe(permisos, origenId)
  return BLOQUES_DE_LA_FICHA.filter((bloque) => puertas[bloque.ancla])
}

type DeLaUrl = {
  seccion: string | undefined
  panel: string | undefined
  relacionados: string | undefined
}

/**
 * El bloque al que lleva la URL al llegar, o null (arriba de todo). `?seccion=` gana: si nombra un bloque que quien mira ve, ése; si nombra
 * uno que no ve o uno que ya no existe, ninguno. Sin una `seccion` conocida, un panel de «Relacionados» (`?panel=desvincular`…) o
 * `?relacionados=<tipo>` llevan a «Relacionados». Lo demás lo puede escribir cualquiera: no lleva a ningún lado.
 */
export function anclaDeLaUrl(
  { seccion, panel, relacionados }: DeLaUrl,
  visibles: readonly { ancla: AnclaDeLaFicha }[],
): AnclaDeLaFicha | null {
  const ve = (ancla: AnclaDeLaFicha) => visibles.some((bloque) => bloque.ancla === ancla)
  const nombrado = BLOQUES_DE_LA_FICHA.find((bloque) => bloque.ancla === seccion)
  if (nombrado) {
    return ve(nombrado.ancla) ? nombrado.ancla : null
  }
  const aRelacionados =
    (panel !== undefined && PANELES_DE_RELACIONADOS.includes(panel)) || relacionados !== undefined
  return aRelacionados && ve('relacionados') ? 'relacionados' : null
}
