// El catálogo de colores de la empresa (nombre técnico heredado: `tonos`): lo puro de crear y guardar uno. Espejo de `_tono_nombre()`, `_tono_hex()` y de los
// topes de `tono_crear()` (en la base, probados con `supabase/tests/tonos.sql` y `areas/diseno/colores.sql`): los motivos que la pantalla da antes de enviar son
// los mismos textos que da la base, así que quien los lea no ve dos frases distintas para lo mismo. La base sigue siendo la autoridad: lo que esto deja pasar,
// ella lo vuelve a decidir. Las versiones de la hoja no se escriben: la base las deriva del hex (`entities/colores.ts` es su espejo).
import { TOPE_DE_COLORES, type ColoresDeUnTono } from '../colores'

export type { ColoresDeUnTema, ColoresDeUnTono } from '../colores'

export const TEMAS_DE_UN_TONO = ['claro', 'oscuro'] as const

// Los topes los pone la base (`_tonos_tope()`, `_tono_nombre()`): son copias, y la lista de la base trae el tope vigente.
export const TOPE_DE_TONOS = TOPE_DE_COLORES
export const LARGO_MAXIMO_DEL_NOMBRE_DE_TONO = 40

// El color con que nace «Nuevo color»: el de los ejemplos de la pantalla.
export const HEX_DE_UN_COLOR_NUEVO = '#31869b'
export const MOTIVO_DEL_HEX = 'Escríbelo como #rrggbb, por ejemplo #31869b.'
export const MOTIVO_SIN_PERMISO_DE_TONOS = 'No tienes permiso para configurar los colores.'

export type TemaDeUnTono = (typeof TEMAS_DE_UN_TONO)[number]

export type Tono = {
  id: string
  // La clave sale del nombre al crearlo y no cambia (la nombran los grupos de una fórmula).
  clave: string
  nombre: string
  // El color tal cual (`#rrggbb`): la tarjeta lo pinta así.
  hex: string
  // La versión: guardar y eliminar la mandan.
  actualizadoEn: string
  // Las versiones de la hoja, derivadas del hex en la base.
  colores: ColoresDeUnTono
}

export type ListaDeTonos = { tope: number; tonos: Tono[] }

// Como `_tono_nombre()`: espacios recortados y colapsados.
export function normalizarNombreDeTono(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

// Como `_tono_hex()`: sin los espacios de las puntas (`btrim` sólo quita espacios), en minúsculas y `#rrggbb`; nada si no se escribió así.
export function normalizarHex(texto: string): string | null {
  const hex = texto.replace(/^ +| +$/g, '').toLowerCase()
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null
}

export type PedidoDeValidarTono = {
  nombre: string
  hex: string
  // Los colores que hay, para el nombre repetido y el tope (sólo se leen su id y su nombre).
  tonos: readonly Pick<Tono, 'id' | 'nombre'>[]
  tope?: number
  // El que se edita (no cuenta contra sí mismo ni contra el tope), o nada al crear.
  original: Tono | null
}

export type TonoValidado =
  | { ok: true; nombre: string; hex: string }
  // El motivo por campo: `nombre` y `hex`.
  | { ok: false; motivos: Record<string, string> }

function motivoDelNombre(
  nombre: string,
  { tonos, tope = TOPE_DE_TONOS, original }: PedidoDeValidarTono,
): string | null {
  if (nombre === '') return 'Escribe el nombre del color.'
  if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE_DE_TONO) {
    return `El nombre del color admite hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_TONO)} caracteres.`
  }
  const minuscula = nombre.toLowerCase()
  const repetido = tonos.some(
    (t) => t.id !== original?.id && normalizarNombreDeTono(t.nombre).toLowerCase() === minuscula,
  )
  if (repetido) return `Ya hay un color «${nombre}».`
  if (original === null && tonos.length >= tope) {
    return `Ya hay ${String(tope)} colores, que es el máximo. Elimina uno que ningún grupo use.`
  }
  return null
}

// Valida lo escrito como lo haría la base; devuelve el nombre y el hex ya normalizados, o todos los motivos a la vez.
export function validarTono(pedido: PedidoDeValidarTono): TonoValidado {
  const nombre = normalizarNombreDeTono(pedido.nombre)
  const hex = normalizarHex(pedido.hex)
  const motivos: Record<string, string> = {}
  const motivoDelNombreDado = motivoDelNombre(nombre, pedido)
  if (motivoDelNombreDado) motivos['nombre'] = motivoDelNombreDado
  if (hex === null) motivos['hex'] = MOTIVO_DEL_HEX
  return hex === null || Object.keys(motivos).length > 0
    ? { ok: false, motivos }
    : { ok: true, nombre, hex }
}

export type CambiosDeUnTono = { nombre?: string; hex?: string }

// Sólo lo que cambió: la base no vuelve a derivar la hoja de un hex que no se tocó. Vacío = nada que guardar.
export function cambiosDeUnTono(
  original: Tono,
  validado: { nombre: string; hex: string },
): CambiosDeUnTono {
  return {
    ...(validado.nombre === original.nombre ? {} : { nombre: validado.nombre }),
    ...(validado.hex === original.hex ? {} : { hex: validado.hex }),
  }
}
