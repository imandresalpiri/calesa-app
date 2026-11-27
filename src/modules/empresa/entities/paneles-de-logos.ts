// Los paneles de las variantes del logo en la URL (`?panel=`), en Configuración › Empresa: la lista (`logos`), «Subir un logo» (`nuevo-logo`),
// «Renombrar» y «Quitar» de una (`&logo=<id>`). Uno solo abierto a la vez; el de una variante reemplaza al de la lista y, al cerrarse, vuelve a ella.
import {
  alTopeDeLogos,
  MENSAJE_DE_LOGO_NO_DISPONIBLE,
  textoDelTopeDeLogos,
  type ListaDeLogos,
  type VarianteDelLogo,
} from './logos'

export const PANEL_DE_LOGOS = 'logos'
export const PANEL_NUEVO_LOGO = 'nuevo-logo'
export const PANEL_RENOMBRAR_LOGO = 'renombrar-logo'
export const PANEL_QUITAR_LOGO = 'quitar-logo'
export const CLAVE_DEL_LOGO = 'logo'

export const PANELES_DE_LOGOS: readonly string[] = [
  PANEL_DE_LOGOS,
  PANEL_NUEVO_LOGO,
  PANEL_RENOMBRAR_LOGO,
  PANEL_QUITAR_LOGO,
]

// Una variante propia (las fijas se cambian en Identidad) por su id, o nada.
export function logoPropioPorId(lista: ListaDeLogos, id: string | null): VarianteDelLogo | null {
  const variante = id === null ? null : (lista.variantes.find((uno) => uno.id === id) ?? null)
  return variante !== null && variante.uso === null ? variante : null
}

// Por qué no abre el modal de una variante pedido por la URL (o nulo): «Subir» al tope, «Renombrar» de una que no está.
export function motivoParaNoAbrirLogo(
  lista: ListaDeLogos,
  modo: 'nuevo' | 'renombrar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return alTopeDeLogos(lista) ? textoDelTopeDeLogos(lista.tope) : null
  }
  if (modo === 'renombrar') {
    return logoPropioPorId(lista, id) ? null : MENSAJE_DE_LOGO_NO_DISPONIBLE
  }
  return null
}
