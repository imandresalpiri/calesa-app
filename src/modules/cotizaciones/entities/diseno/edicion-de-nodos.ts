// El rótulo y el formato de una fila, editados desde el inspector de la hoja: son de la fórmula (la `etiqueta` y el `formato` del nodo) y se guardan con el
// borrador del diseño, en la `definicion` que se manda (`definicionConNodos()`). Lo editado vive aparte de la definición leída: el borrador de la pestaña
// guarda sólo esto. Puras: nada muta lo que recibe.
import { z } from 'zod'
import type { Definicion } from '../formula'
import { esquemaId, FORMATOS, type Formato } from '../nodos'

export const MAXIMO_DEL_ROTULO = 80

export type CambioDeNodo = { etiqueta?: string; formato?: Formato }
export type CambiosDeNodos = Readonly<Record<string, CambioDeNodo>>

export const SIN_CAMBIOS_DE_NODOS: CambiosDeNodos = {}

// Lo que repone el borrador de la pestaña: lo que no tiene esta forma se descarta.
export const esquemaCambiosDeNodos = z.record(
  esquemaId,
  z.strictObject({
    etiqueta: z.string().trim().min(1).max(MAXIMO_DEL_ROTULO).optional(),
    formato: z.enum(FORMATOS).optional(),
  }),
)

const limpio = (texto: string) => Array.from(texto.trim()).slice(0, MAXIMO_DEL_ROTULO).join('')

// Sin blancos a los lados y de hasta 80 caracteres; vacío no se escribe (la fórmula pide un rótulo).
export function ponerEtiqueta(c: CambiosDeNodos, nodo: string, texto: string): CambiosDeNodos {
  const etiqueta = limpio(texto)
  if (etiqueta === '') return c
  return { ...c, [nodo]: { ...c[nodo], etiqueta } }
}

export function ponerFormato(c: CambiosDeNodos, nodo: string, formato: Formato): CambiosDeNodos {
  if (!FORMATOS.includes(formato)) return c
  return { ...c, [nodo]: { ...c[nodo], formato } }
}

// La definición con lo editado: el rótulo y el formato de cada nodo que se cambió (un nodo que ya no está se ignora). Sin cambios, la misma.
export function definicionConNodos(def: Definicion, c: CambiosDeNodos): Definicion {
  const ids = Object.keys(c)
  if (ids.length === 0) return def
  return {
    ...def,
    nodos: def.nodos.map((n) => {
      const cambio = Object.hasOwn(c, n.id) ? c[n.id] : undefined
      return cambio === undefined ? n : { ...n, ...cambio }
    }),
  }
}

// Lo que se guarda sólo si cambia algo de verdad: un rótulo o formato igual al leído no cuenta.
export function cambiosReales(def: Definicion, c: CambiosDeNodos): CambiosDeNodos {
  const leidos = new Map(def.nodos.map((n) => [n.id, n]))
  const salida: Record<string, CambioDeNodo> = {}
  for (const [id, cambio] of Object.entries(c)) {
    const n = leidos.get(id)
    if (n === undefined) continue
    const real: CambioDeNodo = {
      ...(cambio.etiqueta !== undefined && cambio.etiqueta !== n.etiqueta
        ? { etiqueta: cambio.etiqueta }
        : {}),
      ...(cambio.formato !== undefined && cambio.formato !== (n.formato ?? 'usd')
        ? { formato: cambio.formato }
        : {}),
    }
    if (Object.keys(real).length > 0) salida[id] = real
  }
  return salida
}
