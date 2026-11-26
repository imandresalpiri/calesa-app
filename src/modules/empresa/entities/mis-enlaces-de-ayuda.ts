// Los enlaces de ayuda de una persona: los de la empresa en su orden propio (los que ocultó, fuera del menú) y los suyos. Se arman de una sola
// lectura (`enlaces_de_ayuda_de_mi()`) y se guardan enteros (`enlaces_de_ayuda_guardar_mios()`): se guarda lo que oculta y su orden, no una lista
// cerrada de visibles, así que uno nuevo de la empresa aparece visible al final.
import { z } from 'zod'
import { dominioDe, type CamposDeEnlace, type Direccion } from './enlaces-de-ayuda'

// Lo que el menú muestra: un enlace en el orden de quien mira.
export type EnlaceDeAyudaDelMenu = CamposDeEnlace & {
  clave: string
  dominio: string
  propio: boolean
}

export type EnlaceActivoDeLaEmpresa = CamposDeEnlace & { id: string }

// Una fila de `enlaces_de_ayuda_personales`: un enlace de la empresa que ordenó u ocultó, o uno propio.
export type FilaPersonal = {
  id: string
  enlaceId: string | null
  titulo: string | null
  url: string | null
  descripcion: string | null
  oculto: boolean
  orden: number
}

export type MisEnlacesLeidos = {
  // La de lo suyo (nula si no guardó nada): la que manda al guardar.
  version: string | null
  topePropios: number
  // Los activos de la empresa, en el orden de la empresa.
  empresa: EnlaceActivoDeLaEmpresa[]
  mios: FilaPersonal[]
}

export type EnlacePropio = CamposDeEnlace & { id: string }

export type ElementoDeMisEnlaces =
  | { tipo: 'empresa'; enlace: EnlaceActivoDeLaEmpresa; oculto: boolean }
  | ({ tipo: 'propio' } & EnlacePropio)

// La clave estable de un elemento en la lista (para la `key`, el «⋯» y mover).
export function claveDelElemento(elemento: ElementoDeMisEnlaces): string {
  return elemento.tipo === 'empresa' ? `empresa-${elemento.enlace.id}` : `propio-${elemento.id}`
}

// La lista de la persona, en su orden: sus filas (sin las de un enlace de la empresa que ya no está activo, ni repetidos) y, al final, los de
// la empresa que nunca tocó, en el orden de la empresa.
export function armarMisElementos(leidos: MisEnlacesLeidos): ElementoDeMisEnlaces[] {
  const activos = new Map(leidos.empresa.map((enlace) => [enlace.id, enlace]))
  const vistos = new Set<string>()
  const elementos: ElementoDeMisEnlaces[] = []
  const filas = [...leidos.mios].sort((a, b) => a.orden - b.orden || (a.id < b.id ? -1 : 1))
  for (const fila of filas) {
    if (fila.enlaceId !== null) {
      const enlace = activos.get(fila.enlaceId)
      if (enlace && !vistos.has(enlace.id)) {
        vistos.add(enlace.id)
        elementos.push({ tipo: 'empresa', enlace, oculto: fila.oculto })
      }
    } else if (fila.titulo !== null && fila.url !== null) {
      elementos.push({
        tipo: 'propio',
        id: fila.id,
        titulo: fila.titulo,
        url: fila.url,
        descripcion: fila.descripcion,
      })
    }
  }
  for (const enlace of leidos.empresa) {
    if (!vistos.has(enlace.id)) {
      elementos.push({ tipo: 'empresa', enlace, oculto: false })
    }
  }
  return elementos
}

// Lo que se ve en el menú: los que no ocultó, en su orden.
export function enlacesDelMenu(elementos: readonly ElementoDeMisEnlaces[]): EnlaceDeAyudaDelMenu[] {
  return elementos.flatMap((elemento): EnlaceDeAyudaDelMenu[] => {
    if (elemento.tipo === 'empresa') {
      if (elemento.oculto) {
        return []
      }
      const { titulo, url, descripcion } = elemento.enlace
      return [
        {
          clave: claveDelElemento(elemento),
          titulo,
          url,
          descripcion,
          dominio: dominioDe(url),
          propio: false,
        },
      ]
    }
    const { titulo, url, descripcion } = elemento
    return [
      {
        clave: claveDelElemento(elemento),
        titulo,
        url,
        descripcion,
        dominio: dominioDe(url),
        propio: true,
      },
    ]
  })
}

export function armarMisEnlaces(leidos: MisEnlacesLeidos): EnlaceDeAyudaDelMenu[] {
  return enlacesDelMenu(armarMisElementos(leidos))
}

export function cuantosPropios(elementos: readonly ElementoDeMisEnlaces[]): number {
  return elementos.filter((elemento) => elemento.tipo === 'propio').length
}

// La lista con un elemento cambiado de lugar con el de al lado; nula si ya estaba en el extremo o no está.
export function moverElemento(
  elementos: readonly ElementoDeMisEnlaces[],
  clave: string,
  direccion: Direccion,
): ElementoDeMisEnlaces[] | null {
  const i = elementos.findIndex((elemento) => claveDelElemento(elemento) === clave)
  const j = direccion === 'subir' ? i - 1 : i + 1
  const este = elementos[i]
  const otro = elementos[j]
  if (i === -1 || !este || !otro) {
    return null
  }
  const nueva = [...elementos]
  nueva[i] = otro
  nueva[j] = este
  return nueva
}

// Mostrar u ocultar en el menú uno de la empresa.
export function conMostrar(
  elementos: readonly ElementoDeMisEnlaces[],
  enlaceId: string,
  mostrar: boolean,
): ElementoDeMisEnlaces[] {
  return elementos.map((elemento) =>
    elemento.tipo === 'empresa' && elemento.enlace.id === enlaceId
      ? { ...elemento, oculto: !mostrar }
      : elemento,
  )
}

// Suma uno propio al final o reemplaza el que tiene su id (editarlo no lo mueve).
export function conPropio(
  elementos: readonly ElementoDeMisEnlaces[],
  propio: EnlacePropio,
): ElementoDeMisEnlaces[] {
  const nuevo: ElementoDeMisEnlaces = { tipo: 'propio', ...propio }
  const i = elementos.findIndex(
    (elemento) => elemento.tipo === 'propio' && elemento.id === propio.id,
  )
  if (i === -1) {
    return [...elementos, nuevo]
  }
  return elementos.map((elemento, j) => (j === i ? nuevo : elemento))
}

export function sinPropio(
  elementos: readonly ElementoDeMisEnlaces[],
  id: string,
): ElementoDeMisEnlaces[] {
  return elementos.filter((elemento) => elemento.tipo !== 'propio' || elemento.id !== id)
}

export type ElementoAGuardar =
  | { enlace_id: string; oculto: boolean }
  | { id: string; titulo: string; url: string; descripcion: string | null }

// Lo que viaja a `enlaces_de_ayuda_guardar_mios()`: la lista entera, en su orden.
export function paraGuardar(elementos: readonly ElementoDeMisEnlaces[]): ElementoAGuardar[] {
  return elementos.map((elemento) =>
    elemento.tipo === 'empresa'
      ? { enlace_id: elemento.enlace.id, oculto: elemento.oculto }
      : {
          id: elemento.id,
          titulo: elemento.titulo,
          url: elemento.url,
          descripcion: elemento.descripcion,
        },
  )
}

// Una firma de lo leído: si cambia (otra pestaña, «Recargar»), la lista de la pantalla se vuelve a sembrar.
export function firmaDeMisEnlaces(leidos: MisEnlacesLeidos): string {
  return JSON.stringify([
    leidos.version,
    leidos.empresa.map((enlace) => [enlace.id, enlace.titulo, enlace.url, enlace.descripcion]),
  ])
}

const esquemaDeLaLectura = z.object({
  version: z.string().min(1).nullable(),
  tope_propios: z.number(),
  empresa: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      url: z.string(),
      descripcion: z.string().nullable(),
    }),
  ),
  mios: z.array(
    z.object({
      id: z.guid(),
      enlace_id: z.guid().nullable(),
      titulo: z.string().nullable(),
      url: z.string().nullable(),
      descripcion: z.string().nullable(),
      oculto: z.boolean(),
      orden: z.number(),
    }),
  ),
})

// Lo que devuelven `enlaces_de_ayuda_de_mi()` y `enlaces_de_ayuda_guardar_mios()`, o nulo si no tiene la forma.
export function misEnlacesDesde(data: unknown): MisEnlacesLeidos | null {
  const leida = esquemaDeLaLectura.safeParse(data)
  if (!leida.success) {
    return null
  }
  return {
    version: leida.data.version,
    topePropios: leida.data.tope_propios,
    empresa: leida.data.empresa,
    mios: leida.data.mios.map((fila) => ({
      id: fila.id,
      enlaceId: fila.enlace_id,
      titulo: fila.titulo,
      url: fila.url,
      descripcion: fila.descripcion,
      oculto: fila.oculto,
      orden: fila.orden,
    })),
  }
}
