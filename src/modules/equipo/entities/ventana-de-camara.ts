// La ventana de cámara del Modo Live (docs/GLOSARIO.md › «Ventana de cámara»): lo que se guarda por persona en `preferencias_usuario`
// (`live.ventana`) y las reglas de su lugar y su tamaño. La forma guardada tiene su espejo en la base (`_preferencia_live_ventana_valida()`:
// claves, 0–100, 200–4000, hasta 4 datos). No viaja en `ProveedorPreferencias`: la lee el hueco de la ventana, sólo con el Live encendido. Puro.
import { z } from 'zod'

export const CLAVE_DE_VENTANA_DE_CAMARA = 'live.ventana'

// Lo que de quien presenta puede mostrar, en el orden en que se dibuja. Espejo de la lista del `check`.
export const DATOS_DE_LA_VENTANA = ['nombre_y_cargo', 'contacto', 'logo', 'redes_y_web'] as const
export type DatoDeLaVentana = (typeof DATOS_DE_LA_VENTANA)[number]

// px. El mínimo es de la spec (200); el máximo es la mitad de la ventana del navegador; 4000 es el tope que admite la base.
export const ANCHO_MINIMO_DE_LA_VENTANA = 200
export const ANCHO_POR_DEFECTO_DE_LA_VENTANA = 280
export const ANCHO_MAXIMO_GUARDADO = 4000
export const FRACCION_MAXIMA_DEL_ANCHO = 0.5
// Lo que la ventana deja libre contra cada borde del navegador.
export const MARGEN_DE_LA_VENTANA = 12
// Cuánto espera guardar después de soltar (nunca por cuadro).
export const ESPERA_DE_GUARDAR_MS = 500

// `x` e `y`: % del espacio libre (la ventana del navegador menos la de cámara y sus márgenes). 0 = pegada arriba o a la izquierda, 100 = abajo o a la
// derecha. Así sobrevive a otro tamaño de pantalla y nunca queda fuera.
export type VentanaDeCamara = {
  x: number
  y: number
  ancho: number
  minimizada: boolean
  espejo: boolean
  // Con la ficha web, el cargo es el de «Tu ficha en la web» (`cargo_web`) y no el del equipo.
  ficha_web: boolean
  datos: DatoDeLaVentana[]
  // El `deviceId` de la cámara elegida; null = la primera que haya.
  camara: string | null
}

export const VENTANA_POR_DEFECTO: VentanaDeCamara = {
  x: 100,
  y: 8,
  ancho: ANCHO_POR_DEFECTO_DE_LA_VENTANA,
  minimizada: false,
  espejo: true,
  ficha_web: false,
  datos: ['nombre_y_cargo', 'contacto', 'logo'],
  camara: null,
}

const esquemaDeDatos = z
  .array(z.enum(DATOS_DE_LA_VENTANA))
  .max(DATOS_DE_LA_VENTANA.length)
  .refine((datos) => new Set(datos).size === datos.length)

export const esquemaDeLaVentanaDeCamara = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  ancho: z.number().min(ANCHO_MINIMO_DE_LA_VENTANA).max(ANCHO_MAXIMO_GUARDADO),
  minimizada: z.boolean(),
  espejo: z.boolean(),
  ficha_web: z.boolean(),
  datos: esquemaDeDatos,
  camara: z.string().max(300).nullable(),
})

// Lo guardado, campo por campo y tolerante: lo que falta o ya no vale (un dato que se quitó de la lista) vuelve a lo por defecto, sin tirar el resto.
export function ventanaDesde(crudo: unknown): VentanaDeCamara {
  const objeto =
    typeof crudo === 'object' && crudo !== null && !Array.isArray(crudo)
      ? (crudo as Record<string, unknown>)
      : {}
  const campos = esquemaDeLaVentanaDeCamara.shape
  const de = <K extends keyof VentanaDeCamara>(clave: K): VentanaDeCamara[K] => {
    const leido = campos[clave].safeParse(objeto[clave])
    return leido.success ? (leido.data as VentanaDeCamara[K]) : VENTANA_POR_DEFECTO[clave]
  }
  return {
    x: de('x'),
    y: de('y'),
    ancho: de('ancho'),
    minimizada: de('minimizada'),
    espejo: de('espejo'),
    ficha_web: de('ficha_web'),
    datos: de('datos'),
    camara: de('camara'),
  }
}

export type Tamano = { ancho: number; alto: number }
export type Punto = { x: number; y: number }

// El ancho que admite la ventana del navegador: entre el mínimo y su mitad (en una ventana angosta gana el mínimo).
export function anchoMaximoDe(anchoDelNavegador: number): number {
  return Math.max(
    ANCHO_MINIMO_DE_LA_VENTANA,
    Math.floor(anchoDelNavegador * FRACCION_MAXIMA_DEL_ANCHO),
  )
}

export function limitarElAncho(ancho: number, anchoDelNavegador: number): number {
  return Math.round(
    Math.min(Math.max(ancho, ANCHO_MINIMO_DE_LA_VENTANA), anchoMaximoDe(anchoDelNavegador)),
  )
}

const entre = (valor: number, minimo: number, maximo: number) =>
  Math.min(Math.max(valor, minimo), maximo)

// La esquina de arriba a la izquierda, en px de la ventana del navegador, de un % guardado.
export function posicionEnPx(porcentaje: Punto, ventana: Tamano, navegador: Tamano): Punto {
  const libreX = Math.max(0, navegador.ancho - ventana.ancho - 2 * MARGEN_DE_LA_VENTANA)
  const libreY = Math.max(0, navegador.alto - ventana.alto - 2 * MARGEN_DE_LA_VENTANA)
  return {
    x: MARGEN_DE_LA_VENTANA + (entre(porcentaje.x, 0, 100) / 100) * libreX,
    y: MARGEN_DE_LA_VENTANA + (entre(porcentaje.y, 0, 100) / 100) * libreY,
  }
}

// Lo inverso: de la esquina en px al % que se guarda. Una posición fuera del navegador queda en el borde (0 o 100); sin espacio libre, 0.
export function porcentajeDePosicion(posicion: Punto, ventana: Tamano, navegador: Tamano): Punto {
  const libreX = navegador.ancho - ventana.ancho - 2 * MARGEN_DE_LA_VENTANA
  const libreY = navegador.alto - ventana.alto - 2 * MARGEN_DE_LA_VENTANA
  const aPorcentaje = (px: number, libre: number) =>
    libre <= 0
      ? 0
      : Math.round(entre(((px - MARGEN_DE_LA_VENTANA) / libre) * 100, 0, 100) * 100) / 100
  return { x: aPorcentaje(posicion.x, libreX), y: aPorcentaje(posicion.y, libreY) }
}

// Lleva una esquina en px adentro de la ventana del navegador (al achicarla, o al arrastrar): ni un borde afuera. Si la ventana de cámara no cabe, queda
// contra el margen de arriba a la izquierda.
export function llevarAdentro(posicion: Punto, ventana: Tamano, navegador: Tamano): Punto {
  const maxX = Math.max(
    MARGEN_DE_LA_VENTANA,
    navegador.ancho - ventana.ancho - MARGEN_DE_LA_VENTANA,
  )
  const maxY = Math.max(MARGEN_DE_LA_VENTANA, navegador.alto - ventana.alto - MARGEN_DE_LA_VENTANA)
  return {
    x: entre(posicion.x, MARGEN_DE_LA_VENTANA, maxX),
    y: entre(posicion.y, MARGEN_DE_LA_VENTANA, maxY),
  }
}

// El alto del video de un ancho dado: siempre 16:9, también sin cámara (el aviso mide lo mismo que el video: nada salta).
export const PROPORCION_DEL_VIDEO = 16 / 9
export const altoDelVideo = (ancho: number): number => Math.round(ancho / PROPORCION_DEL_VIDEO)

// Lo que se dibuja de quien presenta, ya resuelto en el servidor (`leerLaVentanaDeCamara()` y las piezas de la empresa y de la web que arma el layout).
export type FichaDeQuienPresenta = {
  nombre: string
  cargo: string | null
  cargoWeb: string | null
  telefono: string | null
  whatsapp: string | null
}

export type DatosDeQuienPresenta = FichaDeQuienPresenta & {
  empresa: {
    nombre: string
    logoUrl: string | null
    logoOscuroUrl: string | null
    // Las redes con valor, con su etiqueta («Instagram»), y la web.
    redes: readonly { clave: string; etiqueta: string; valor: string }[]
    web: string | null
  }
}

// El cargo que se muestra: con «ficha web», el de la ficha si lo escribió; si no, el del equipo.
export function cargoAMostrar(datos: DatosDeQuienPresenta, fichaWeb: boolean): string | null {
  return (fichaWeb ? (datos.cargoWeb ?? datos.cargo) : datos.cargo) || null
}

// WhatsApp si lo cargó (es el que usa la ficha web); si no, el teléfono. `null` si no hay ninguno.
export function contactoAMostrar(datos: DatosDeQuienPresenta): string | null {
  return datos.whatsapp || datos.telefono || null
}

// La dirección sin el esquema ni la barra final, para leerla de lejos: «instagram.com/importadora».
export function direccionLegible(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
}
