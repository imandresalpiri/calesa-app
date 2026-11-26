import { e2eAfectados } from './e2e-afectados/eleccion.mjs'

// Ayuda de las pruebas de `e2e-afectados`: la elección sobre archivos en memoria.

type Archivos = Record<string, string>
type Cambios = Record<string, { agregadas: string[]; quitadas: string[] }>

export function elegir(opciones: {
  archivos: string[]
  cambios?: Cambios
  specs: Archivos
  soportes?: Archivos
  fuentes?: Archivos
  tope?: number
}) {
  const todo: Archivos = { ...opciones.specs, ...opciones.soportes, ...opciones.fuentes }
  return e2eAfectados({
    archivos: opciones.archivos,
    cambios: opciones.cambios ?? {},
    specs: Object.keys(opciones.specs),
    soportes: Object.keys(opciones.soportes ?? {}),
    fuentes: Object.keys(opciones.fuentes ?? {}),
    leer: (a: string) => todo[a] ?? null,
    ...(opciones.tope === undefined ? {} : { tope: opciones.tope }),
  })
}
