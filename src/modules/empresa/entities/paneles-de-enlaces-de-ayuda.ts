// Los paneles de los enlaces de ayuda en la URL (`?panel=`) y lo que se revisa al abrir uno. En Configuración › Empresa: la lista
// (`enlaces-de-ayuda`), «Nuevo enlace», «Editar» y «Quitar» de uno (`&enlace=<id>`). En Perfil: la lista de quien mira
// (`enlaces-de-ayuda`, el mismo valor en otra pantalla) y el modal de un enlace propio.
import {
  alTopeDeLaEmpresa,
  textoDelTopeDeLaEmpresa,
  type EnlaceDeAyudaDeLaEmpresa,
  type ListaDeEnlacesDeLaEmpresa,
} from './enlaces-de-ayuda'
import {
  cuantosPropios,
  type ElementoDeMisEnlaces,
  type EnlacePropio,
} from './mis-enlaces-de-ayuda'

export const PANEL_DE_ENLACES_DE_AYUDA = 'enlaces-de-ayuda'
export const PANEL_NUEVO_ENLACE_DE_AYUDA = 'nuevo-enlace-de-ayuda'
export const PANEL_EDITAR_ENLACE_DE_AYUDA = 'editar-enlace-de-ayuda'
export const PANEL_QUITAR_ENLACE_DE_AYUDA = 'quitar-enlace-de-ayuda'
export const PANEL_NUEVO_ENLACE_PROPIO = 'nuevo-enlace-propio'
export const PANEL_EDITAR_ENLACE_PROPIO = 'editar-enlace-propio'
export const CLAVE_DEL_ENLACE = 'enlace'

// Todos los de la familia de la tarjeta de Empresa: uno solo abierto a la vez.
export const PANELES_DE_LA_EMPRESA: readonly string[] = [
  PANEL_DE_ENLACES_DE_AYUDA,
  PANEL_NUEVO_ENLACE_DE_AYUDA,
  PANEL_EDITAR_ENLACE_DE_AYUDA,
  PANEL_QUITAR_ENLACE_DE_AYUDA,
]

// Los de la familia de la tarjeta de Perfil.
export const PANELES_DEL_PERFIL: readonly string[] = [
  PANEL_DE_ENLACES_DE_AYUDA,
  PANEL_NUEVO_ENLACE_PROPIO,
  PANEL_EDITAR_ENLACE_PROPIO,
]

export const MENSAJE_DE_ENLACE_NO_DISPONIBLE = 'Ese enlace de ayuda ya no existe.'

export function enlacePorId(
  enlaces: readonly EnlaceDeAyudaDeLaEmpresa[],
  id: string | null,
): EnlaceDeAyudaDeLaEmpresa | null {
  return id === null ? null : (enlaces.find((uno) => uno.id === id) ?? null)
}

// Por qué no abre el modal de un enlace de la empresa pedido por la URL (o nulo): «Nuevo» al tope, «Editar» de uno que no está.
export function motivoParaNoAbrirEnlace(
  lista: ListaDeEnlacesDeLaEmpresa,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return alTopeDeLaEmpresa(lista) ? textoDelTopeDeLaEmpresa(lista.tope) : null
  }
  if (modo === 'editar') {
    return enlacePorId(lista.enlaces, id) ? null : MENSAJE_DE_ENLACE_NO_DISPONIBLE
  }
  return null
}

// Una firma de la lista de la empresa: si cambia (otra persona, «Recargar»), la de la pantalla se vuelve a sembrar.
export function firmaDeEnlaces(lista: ListaDeEnlacesDeLaEmpresa): string {
  return lista.enlaces.map((uno) => `${uno.id}@${uno.actualizadoEn}#${String(uno.orden)}`).join('|')
}

export const MENSAJE_DE_PROPIO_NO_DISPONIBLE = 'Ese enlace propio ya no está.'

export function textoDelTopeDePropios(tope: number): string {
  return `Ya tienes ${String(tope)} enlaces propios: quita uno para sumar otro.`
}

export function propioPorId(
  elementos: readonly ElementoDeMisEnlaces[],
  id: string | null,
): EnlacePropio | null {
  const elemento = elementos.find((uno) => uno.tipo === 'propio' && uno.id === id)
  return elemento?.tipo === 'propio' ? elemento : null
}

// Por qué no abre el modal de un enlace propio pedido por la URL (o nulo): «Agregar» al tope de propios, «Editar» de uno que no está.
export function motivoParaNoAbrirPropio(
  elementos: readonly ElementoDeMisEnlaces[],
  tope: number,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return cuantosPropios(elementos) >= tope ? textoDelTopeDePropios(tope) : null
  }
  if (modo === 'editar') {
    return propioPorId(elementos, id) ? null : MENSAJE_DE_PROPIO_NO_DISPONIBLE
  }
  return null
}
