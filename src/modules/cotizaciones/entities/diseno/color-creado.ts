// El color que acaba de crear «Nuevo color» al vuelo, tomado de la lista que devuelve `tono_crear()`: el id del color es el del intento (`p_id`), así que se busca
// por él (también si el pedido ya estaba hecho y la base devolvió el mismo). Puro.
import type { ColorCreado } from '../nuevo-color'
import type { ListaDeTonos } from './tonos'

export function colorCreadoDe(lista: ListaDeTonos, intento: string): ColorCreado | null {
  const tono = lista.tonos.find((t) => t.id === intento)
  if (tono === undefined) return null
  return {
    clave: tono.clave,
    nombre: tono.nombre,
    claro: tono.colores.claro,
    oscuro: tono.colores.oscuro,
  }
}
