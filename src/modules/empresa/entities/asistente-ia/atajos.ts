// La lista de atajos que edita «Prompt base y atajos», como borrador local: se guarda entera, con el prompt base, en una escritura. El orden
// de la lista es el de los botones al compartir.
import { MAX_TOKENS_DE_UN_ATAJO_NUEVO, TOPE_DE_ATAJOS, type AtajoDelAsistente } from './config'

export const MOTIVO_TOPE_DE_ATAJOS = `Llegaste a ${TOPE_DE_ATAJOS} atajos: quita uno para sumar otro.`

export type DireccionDelAtajo = 'subir' | 'bajar'

export type CambioDeAtajo = Partial<Pick<AtajoDelAsistente, 'nombre' | 'instruccion' | 'activo'>>

// Por qué «Nuevo atajo» va apagado, o null si se puede sumar otro.
export function motivoParaNoAgregarAtajo(lista: readonly AtajoDelAsistente[]): string | null {
  return lista.length >= TOPE_DE_ATAJOS ? MOTIVO_TOPE_DE_ATAJOS : null
}

// El nuevo entra primero, junto a «Nuevo atajo», activo y vacío; con el tope, la lista queda igual.
export function agregarAtajo(lista: readonly AtajoDelAsistente[], id: string): AtajoDelAsistente[] {
  if (motivoParaNoAgregarAtajo(lista) !== null) return [...lista]
  return [
    { id, nombre: '', instruccion: '', activo: true, maxTokens: MAX_TOKENS_DE_UN_ATAJO_NUEVO },
    ...lista,
  ]
}

export function quitarAtajo(lista: readonly AtajoDelAsistente[], id: string): AtajoDelAsistente[] {
  return lista.filter((a) => a.id !== id)
}

// En un extremo, o con un id que no está, la lista queda igual.
export function moverAtajo(
  lista: readonly AtajoDelAsistente[],
  id: string,
  direccion: DireccionDelAtajo,
): AtajoDelAsistente[] {
  const desde = lista.findIndex((a) => a.id === id)
  const hasta = direccion === 'subir' ? desde - 1 : desde + 1
  const movido = lista[desde]
  const otro = lista[hasta]
  if (desde === -1 || movido === undefined || otro === undefined) return [...lista]
  const nueva = [...lista]
  nueva[hasta] = movido
  nueva[desde] = otro
  return nueva
}

export function cambiarAtajo(
  lista: readonly AtajoDelAsistente[],
  id: string,
  cambio: CambioDeAtajo,
): AtajoDelAsistente[] {
  return lista.map((a) => (a.id === id ? { ...a, ...cambio } : a))
}
