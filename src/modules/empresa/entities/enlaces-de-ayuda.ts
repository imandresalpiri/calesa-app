// Enlaces de ayuda (docs/GLOSARIO.md › Enlaces de ayuda): los que la empresa prepara para «Ayuda» del menú del perfil. Distintos de la ayuda de
// una celda (`EnlaceDeAyuda` del diseño de la hoja, en `cotizaciones`). Topes y reglas: espejo de los `check` y de las RPC `enlace_de_ayuda_*`.
import { z } from 'zod'

// Cuántos puede tener la empresa y cuántos propios cada persona (`_enlaces_de_ayuda_tope()`, `_enlaces_de_ayuda_tope_propios()`).
export const TOPE_DE_ENLACES_DE_LA_EMPRESA = 30
export const TOPE_DE_ENLACES_PROPIOS = 20

export const LARGO_MAXIMO_DEL_TITULO = 80
export const LARGO_MAXIMO_DE_LA_DESCRIPCION = 140
export const LARGO_MAXIMO_DE_LA_URL = 2000

export const MENSAJE_SIN_TITULO = 'Escribe un título.'
export const MENSAJE_TITULO_LARGO = `El título puede tener hasta ${String(LARGO_MAXIMO_DEL_TITULO)} caracteres.`
export const MENSAJE_DE_URL = 'Escribe una dirección que empiece con https://.'
export const MENSAJE_URL_LARGA = 'La dirección puede tener hasta 2.000 caracteres.'
export const MENSAJE_DESCRIPCION_LARGA = `La descripción puede tener hasta ${String(LARGO_MAXIMO_DE_LA_DESCRIPCION)} caracteres.`

// Los campos de un enlace, de la empresa o propio.
export type CamposDeEnlace = { titulo: string; url: string; descripcion: string | null }
export type CampoDeEnlace = keyof CamposDeEnlace

export type EnlaceDeAyudaDeLaEmpresa = CamposDeEnlace & {
  id: string
  orden: number
  // Desactivado: sigue en la lista de la empresa y no se ve en el menú de nadie.
  activo: boolean
  // Como lo da la base: la versión que manda quien edita.
  actualizadoEn: string
}

export type ListaDeEnlacesDeLaEmpresa = { tope: number; enlaces: EnlaceDeAyudaDeLaEmpresa[] }

// Como la base: `char_length` cuenta puntos de código, no unidades de UTF-16.
export function largoDe(texto: string): number {
  return Array.from(texto).length
}

// Espejo del regex de la base: `https://`, un dominio y lo que siga, sin espacios.
const URL_DE_AYUDA = /^https:\/\/[^\s/?#]+([/?#]\S*)?$/i

export function esUrlDeAyuda(texto: string): boolean {
  return URL_DE_AYUDA.test(texto) && largoDe(texto) <= LARGO_MAXIMO_DE_LA_URL
}

// El dominio que el menú muestra junto al título (`ayuda.ejemplo.com`); si la dirección no se entiende, la dirección.
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// Lo que cruza el límite (formulario y action) cuando se crea o edita un enlace: recortado, `https://` (con `z.url()`) y sus largos. La base lo
// repite con el campo en el `hint`.
export const esquemaDeCamposDeEnlace = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, { error: MENSAJE_SIN_TITULO })
    .refine((v) => largoDe(v) <= LARGO_MAXIMO_DEL_TITULO, { error: MENSAJE_TITULO_LARGO }),
  url: z
    .string()
    .trim()
    .refine((v) => largoDe(v) <= LARGO_MAXIMO_DE_LA_URL, { error: MENSAJE_URL_LARGA })
    .pipe(
      z
        .url({ protocol: /^https$/, error: MENSAJE_DE_URL })
        .refine((v) => URL_DE_AYUDA.test(v), { error: MENSAJE_DE_URL }),
    ),
  descripcion: z
    .string()
    .trim()
    .refine((v) => largoDe(v) <= LARGO_MAXIMO_DE_LA_DESCRIPCION, {
      error: MENSAJE_DESCRIPCION_LARGA,
    })
    .nullable()
    .transform((v) => (v === null || v === '' ? null : v)),
})

export type EntradaDeCamposDeEnlace = z.input<typeof esquemaDeCamposDeEnlace>

// Lo tipeado en el modal, revisado antes de mandarlo: los campos listos o el motivo de cada campo que no sirve.
export function revisarCamposDeEnlace(
  entrada: EntradaDeCamposDeEnlace,
):
  | { ok: true; campos: CamposDeEnlace }
  | { ok: false; motivos: Partial<Record<CampoDeEnlace, string>> } {
  const leido = esquemaDeCamposDeEnlace.safeParse(entrada)
  if (leido.success) {
    return { ok: true, campos: leido.data }
  }
  const motivos: Partial<Record<CampoDeEnlace, string>> = {}
  for (const problema of leido.error.issues) {
    const campo = problema.path[0]
    if ((campo === 'titulo' || campo === 'url' || campo === 'descripcion') && !motivos[campo]) {
      motivos[campo] = problema.message
    }
  }
  return { ok: false, motivos }
}

// Si lo tipeado difiere de lo guardado (para preguntar antes de cerrar y para no mandar nada si no cambió).
export function camposCambiados(
  tipeado: { titulo: string; url: string; descripcion: string },
  original: CamposDeEnlace | null,
): boolean {
  if (original === null) {
    return (
      tipeado.titulo.trim() !== '' || tipeado.url.trim() !== '' || tipeado.descripcion.trim() !== ''
    )
  }
  return (
    tipeado.titulo.trim() !== original.titulo ||
    tipeado.url.trim() !== original.url ||
    (tipeado.descripcion.trim() || null) !== original.descripcion
  )
}

const esquemaDelEnlaceDeLaEmpresa = z.object({
  id: z.guid(),
  titulo: z.string(),
  url: z.string(),
  descripcion: z.string().nullable(),
  orden: z.number(),
  activo: z.boolean(),
  actualizado_en: z.string().min(1),
})

const esquemaDeLaLista = z.object({
  tope: z.number(),
  enlaces: z.array(esquemaDelEnlaceDeLaEmpresa),
})

// La lista que devuelve cada RPC (`_enlaces_de_ayuda_lista()`), o nula si no tiene la forma.
export function listaDeLaEmpresaDesde(data: unknown): ListaDeEnlacesDeLaEmpresa | null {
  const leida = esquemaDeLaLista.safeParse(data)
  if (!leida.success) {
    return null
  }
  return {
    tope: leida.data.tope,
    enlaces: leida.data.enlaces.map((fila) => ({
      id: fila.id,
      titulo: fila.titulo,
      url: fila.url,
      descripcion: fila.descripcion,
      orden: fila.orden,
      activo: fila.activo,
      actualizadoEn: fila.actualizado_en,
    })),
  }
}

// La respuesta de una escritura: la lista entera, que reemplaza a la de la pantalla.
export function respuestaDeEnlacesDesde(data: unknown): ListaDeEnlacesDeLaEmpresa | null {
  if (typeof data !== 'object' || data === null || !('lista' in data)) {
    return null
  }
  return listaDeLaEmpresaDesde(data.lista)
}

export function alTopeDeLaEmpresa(lista: ListaDeEnlacesDeLaEmpresa): boolean {
  return lista.enlaces.length >= lista.tope
}

export function textoDelTopeDeLaEmpresa(tope: number): string {
  return `La empresa ya tiene ${String(tope)} enlaces de ayuda: quita uno para sumar otro.`
}

export type Direccion = 'subir' | 'bajar'

// Si un enlace puede subir o bajar en la lista de la empresa (los desactivados también tienen lugar).
export function puedeMoverse(
  enlaces: readonly { id: string }[],
  id: string,
  direccion: Direccion,
): boolean {
  const i = enlaces.findIndex((uno) => uno.id === id)
  if (i === -1) {
    return false
  }
  return direccion === 'subir' ? i > 0 : i < enlaces.length - 1
}

// Lo que el lector de pantalla dice tras mover uno: «Manual, 2 de 5».
export function textoDelLugar(
  enlaces: readonly { id: string; titulo: string }[],
  id: string,
): string {
  const i = enlaces.findIndex((uno) => uno.id === id)
  const enlace = enlaces[i]
  return enlace ? `${enlace.titulo}, ${String(i + 1)} de ${String(enlaces.length)}` : ''
}
