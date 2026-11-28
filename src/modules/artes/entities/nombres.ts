// Los nombres de una plantilla de arte y de una imagen de la biblioteca: de 1 a 80 letras sin los espacios de los bordes, como el `check` de
// las dos tablas (`char_length(btrim(nombre))`, que cuenta letras y no bytes). Puro.
import { z } from 'zod'

export const LARGO_MAXIMO_DEL_NOMBRE = 80
export const NOMBRE_INICIAL = 'Nueva plantilla'
export const MENSAJE_DEL_NOMBRE = `Escribe un nombre de hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} letras.`
const SUFIJO_DE_LA_COPIA = ' (copia)'
const NOMBRE_DE_IMAGEN_SIN_NOMBRE = 'Imagen'

const letras = (texto: string): string[] => Array.from(texto)

export const esquemaDelNombreDeArte = z
  .string()
  .trim()
  .refine((v) => v.length > 0 && letras(v).length <= LARGO_MAXIMO_DEL_NOMBRE, {
    error: MENSAJE_DEL_NOMBRE,
  })

// «<nombre> (copia)», recortando el nombre para que el total no pase de 80.
export function nombreDeLaCopia(nombre: string): string {
  const cabe = LARGO_MAXIMO_DEL_NOMBRE - letras(SUFIJO_DE_LA_COPIA).length
  const base = letras(nombre.trim()).slice(0, cabe).join('').trimEnd()
  return `${base}${SUFIJO_DE_LA_COPIA}`
}

// El nombre con que se propone una imagen subida: el del archivo sin su extensión, recortado.
export function nombreDesdeElArchivo(archivo: string): string {
  const sinExtension = archivo.replace(/\.[a-z0-9]{1,5}$/i, '').trim()
  const recortado = letras(sinExtension).slice(0, LARGO_MAXIMO_DEL_NOMBRE).join('').trim()
  return recortado === '' ? NOMBRE_DE_IMAGEN_SIN_NOMBRE : recortado
}
