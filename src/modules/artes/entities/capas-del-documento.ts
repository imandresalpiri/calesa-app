// Las capas del documento de una plantilla de arte (docs/GLOSARIO.md › «Capa»), versión 3. Coordenadas y tamaños en unidades lógicas del
// formato (px o pt), con decimales y sin redondear: `x, y` es la esquina de la caja sin rotar y la rotación (en grados) es alrededor de su
// centro. Lo que una capa dibuja por dentro (los puntos de una línea, los nodos de un trazo) va relativo a la esquina de su caja. Puro.
import { z } from 'zod'

export const MAXIMO_DE_NODOS_POR_TRAZO = 200
export const MAXIMO_DE_FOTOS_DEL_VEHICULO = 20
export const LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA = 80
export const PESOS_DE_TEXTO = [400, 500, 600, 700] as const
export const INTERLINEADO_MINIMO = 0.5
export const INTERLINEADO_MAXIMO = 3
export const LADOS_MINIMOS = 3
export const LADOS_MAXIMOS = 12

export const color = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
export const idLocal = z.string().min(1).max(64)
const coordenada = z.number().finite()
const lado = z.number().finite().nonnegative()
const punto = z.object({ x: coordenada, y: coordenada })

export const esquemaDeLaSombra = z.object({
  color,
  desenfoque: z.number().finite().min(0).max(500),
  x: coordenada,
  y: coordenada,
})

const baseDeCapa = {
  id: idLocal,
  // El que la persona le puso en «Capas»; nulo, el que se arma de lo que es (`nombreVisible()`).
  nombre: z.string().max(LARGO_MAXIMO_DEL_NOMBRE_DE_CAPA).nullable(),
  // El grupo de un solo nivel al que pertenece (`grupos` de la página); sus miembros van contiguos.
  grupoId: idLocal.nullable(),
  x: coordenada,
  y: coordenada,
  ancho: lado,
  alto: lado,
  rotacion: z.number().finite(),
  opacidad: z.number().min(0).max(1),
  bloqueada: z.boolean(),
  oculta: z.boolean(),
  sombra: esquemaDeLaSombra.nullable(),
}

// El marco de lo que dibuja una imagen (de la biblioteca, una foto del vehículo, la tarjeta de la cotización o el logo).
const marco = { radio: lado, borde: color.nullable(), grosor: lado }
const ajuste = z.enum(['cubrir', 'contener'])

const capaDeTexto = z.object({
  ...baseDeCapa,
  tipo: z.literal('texto'),
  // Puede llevar variables `{clave}` (el catálogo del origen, `entities/datos/variables-del-arte.ts`): se llenan con los datos al dibujar.
  texto: z.string().max(5000),
  fuente: z.string().min(1).max(80),
  // El tamaño de la letra: no cambia al duplicar en otro formato ni con las asas (sólo el inspector lo cambia).
  tamano: z.number().finite().positive(),
  peso: z.union(PESOS_DE_TEXTO.map((p) => z.literal(p))),
  interlineado: z.number().finite().min(INTERLINEADO_MINIMO).max(INTERLINEADO_MAXIMO),
  color,
  alineacion: z.enum(['izquierda', 'centro', 'derecha']),
  borde: color.nullable(),
  grosor: lado,
})

const capaDeImagen = z.object({
  ...baseDeCapa,
  ...marco,
  tipo: z.literal('imagen'),
  // Una imagen de la biblioteca, por referencia: nunca su archivo.
  imagenId: z.guid(),
  ajuste,
})

const capaDeForma = z
  .object({
    ...baseDeCapa,
    tipo: z.literal('forma'),
    forma: z.enum(['rectangulo', 'elipse', 'poligono']),
    // Sólo el polígono: cuántos lados (de 3 a 12).
    lados: z.number().int().min(LADOS_MINIMOS).max(LADOS_MAXIMOS).nullable(),
    relleno: color.nullable(),
    borde: color.nullable(),
    grosor: lado,
    // Las esquinas redondeadas (sólo el rectángulo).
    radio: lado,
  })
  .refine((capa) => (capa.forma === 'poligono') === (capa.lados !== null))

const capaDeLinea = z.object({
  ...baseDeCapa,
  tipo: z.literal('linea'),
  puntos: z.tuple([punto, punto]),
  borde: color,
  grosor: lado,
})

export const esquemaDelNodo = z.object({
  x: coordenada,
  y: coordenada,
  // Las asas de la curva Bézier, en la misma caja que el nodo; nula, el tramo llega o sale recto.
  entrada: punto.nullable(),
  salida: punto.nullable(),
})

const capaDeTrazo = z.object({
  ...baseDeCapa,
  tipo: z.literal('trazo'),
  nodos: z.array(esquemaDelNodo).min(2).max(MAXIMO_DE_NODOS_POR_TRAZO),
  cerrado: z.boolean(),
  relleno: color.nullable(),
  borde: color.nullable(),
  grosor: lado,
})

const capaDeLogo = z.object({
  ...baseDeCapa,
  ...marco,
  tipo: z.literal('logo'),
  // Una variante del logo de la empresa (`principal`, `oscuro` o su guid); sin ella, el logo principal.
  varianteId: z.string().min(1).max(64).nullable(),
})

const capaDeFoto = z.object({
  ...baseDeCapa,
  ...marco,
  tipo: z.literal('foto'),
  // Qué foto del vehículo (la primera es 0): la llena el vehículo que se comparte.
  indice: z
    .number()
    .int()
    .min(0)
    .max(MAXIMO_DE_FOTOS_DEL_VEHICULO - 1),
  ajuste,
  // El punto de la foto que queda a la vista al recortarla para cubrir la caja, en fracciones de su ancho y su alto (0,5 y 0,5 es el
  // centro). Con «contener» no cuenta: la foto se ve entera.
  foco: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
})

const capaDeTarjeta = z.object({
  ...baseDeCapa,
  ...marco,
  tipo: z.literal('tarjeta'),
})

export const esquemaDeCapa = z.discriminatedUnion('tipo', [
  capaDeTexto,
  capaDeImagen,
  capaDeForma,
  capaDeLinea,
  capaDeTrazo,
  capaDeLogo,
  capaDeFoto,
  capaDeTarjeta,
])
export type CapaDeArte = z.infer<typeof esquemaDeCapa>
export type TipoDeCapa = CapaDeArte['tipo']
export type CapaDe<T extends TipoDeCapa> = Extract<CapaDeArte, { tipo: T }>
export type NodoDelTrazo = z.infer<typeof esquemaDelNodo>
export type Punto = z.infer<typeof punto>
export type SombraDeCapa = z.infer<typeof esquemaDeLaSombra>
export type FocoDeLaFoto = CapaDe<'foto'>['foco']

// Con el que nace una foto (y el que le pone la migración a las de antes): el centro, como se recortaba siempre.
export const FOCO_AL_CENTRO: FocoDeLaFoto = { x: 0.5, y: 0.5 }

// Las capas que dibujan una imagen (con su marco: radio, borde y grosor).
export const TIPOS_CON_IMAGEN = ['imagen', 'logo', 'foto', 'tarjeta'] as const
export type CapaConImagen = CapaDe<(typeof TIPOS_CON_IMAGEN)[number]>

export function esCapaConImagen(capa: CapaDeArte): capa is CapaConImagen {
  return (TIPOS_CON_IMAGEN as readonly string[]).includes(capa.tipo)
}
