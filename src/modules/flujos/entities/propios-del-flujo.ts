// Los tipos de documento propios de un flujo y los compartidos que tapan: un propio activo con la misma clave que un compartido (`claveDeCatalogo`:
// sin importar mayúsculas, tildes ni espacios de más) lo tapa en su flujo, que es el de un origen o el de repuestos. Tapar no reescribe nada: sólo
// cambia lo que se ofrece. Puro y del núcleo: lo usan los tipos de documento (la insignia) y los requisitos (el rótulo y lo que se ofrece).
import { claveDeCatalogo, tapadoPor } from '@/shared/lib/catalogos/propios'

type TipoConNombre = { id: string; nombre: string }

// Los propios no tienen origen en la tabla (tienen flujo): para la regla compartida, todos son del mismo «origen», el flujo.
const DEL_FLUJO = 'flujo'

// Los ids de los compartidos que tapa un propio activo del flujo.
export function compartidosTapados(
  compartidos: readonly TipoConNombre[],
  propios: readonly (TipoConNombre & { activo: boolean })[],
): Set<string> {
  const filas = [
    ...compartidos.map((t) => ({
      id: t.id,
      origenId: null,
      clave: claveDeCatalogo(t.nombre),
      activo: true,
    })),
    ...propios.map((t) => ({
      id: t.id,
      origenId: DEL_FLUJO,
      clave: claveDeCatalogo(t.nombre),
      activo: t.activo,
    })),
  ]
  return new Set(filas.filter((f) => tapadoPor(f, filas, DEL_FLUJO) !== null).map((f) => f.id))
}

// Quién tapa, como lo dicen la insignia y el rótulo: «el de Miami» o, sin origen, «el del flujo de repuestos».
export function quienTapa(origen: string | null): string {
  return origen === null ? 'el del flujo de repuestos' : `el de ${origen}`
}
