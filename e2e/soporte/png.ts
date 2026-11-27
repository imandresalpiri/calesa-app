import { randomBytes } from 'node:crypto'
import { deflateSync } from 'node:zlib'

// PNG RGBA hechos a mano para subir como logo: uno chico con la mitad transparente y otro de ruido que pesa más de 1 MB.

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(datos: Buffer): number {
  let c = 0xffffffff
  for (const byte of datos) c = (TABLA_CRC[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function trozo(tipo: string, datos: Buffer): Buffer {
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos])
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const suma = Buffer.alloc(4)
  suma.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, suma])
}
function png(
  lado: number,
  pixel: (x: number, y: number) => [number, number, number, number],
): Buffer {
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(lado, 0)
  cabecera.writeUInt32BE(lado, 4)
  cabecera.set([8, 6, 0, 0, 0], 8) // 8 bits, RGBA
  const filas = Buffer.alloc((lado * 4 + 1) * lado)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      filas.set(pixel(x, y), y * (lado * 4 + 1) + 1 + x * 4)
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(filas, { level: 0 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}
export const PNG_CON_TRANSPARENCIA = png(64, (x) => (x < 32 ? [11, 114, 133, 255] : [0, 0, 0, 0]))
export const PNG_PESADO = png(
  600,
  () => [...randomBytes(3), 255] as [number, number, number, number],
)
