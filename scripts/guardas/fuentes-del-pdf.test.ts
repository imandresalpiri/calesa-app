// @vitest-environment node
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { FUENTE_DEL_PDF } from '../../src/modules/artes/entities/editor/fuentes'
import { VARIANTES_DE_LAS_FUENTES } from '../../src/modules/cotizaciones/infra/tarjeta/fuentes-de-la-tarjeta'
import configuracion from '../../next.config'

vi.mock('server-only', () => ({}))

// Las fuentes Geist en TTF viven en una sola carpeta (`public/fuentes/geist/`): las leen del disco el PDF y la imagen de la tarjeta de la
// cotización y el PDF de un arte (`FUENTE_DEL_PDF`), y el navegador por URL. Una ruta que las lee del disco y no las nombra en `outputFileTracingIncludes` funciona en local y cae al
// desplegar (el trazado de archivos no ve un `readFile` ni la ruta que se le pasa a react-pdf). Esta guarda mira que cada archivo nombrado exista
// y que cada ruta que las lee las lleve.
const CARPETA = 'public/fuentes/geist'

// Las rutas que leen las fuentes del disco: el PDF y la imagen de la tarjeta.
const RUTAS_QUE_LAS_LEEN = [
  '/cotizaciones/[id]/pdf',
  '/cotizaciones/[id]/imagen',
  '/artes/[id]/pdf',
]

const archivo = (nombre: string) => path.join(process.cwd(), CARPETA, nombre)

describe('las fuentes del PDF', () => {
  it('cada archivo nombrado está en public/fuentes/geist', () => {
    const nombrados = [
      ...VARIANTES_DE_LAS_FUENTES.map((v) => v.archivo),
      ...Object.values(FUENTE_DEL_PDF.archivos),
    ]
    expect(nombrados.filter((nombre) => !existsSync(archivo(nombre)))).toEqual([])
    expect(existsSync(archivo('OFL.txt'))).toBe(true)
    expect(`public${FUENTE_DEL_PDF.carpeta}`).toBe(CARPETA)
  })

  it('cada ruta que las lee las lleva al desplegar', () => {
    const incluidos = configuracion('phase-test').outputFileTracingIncludes ?? {}
    for (const ruta of RUTAS_QUE_LAS_LEEN) {
      expect(incluidos[ruta] ?? [], ruta).toContain(`./${CARPETA}/*`)
      const carpeta = path.join(process.cwd(), 'src/app/(app)', ruta.slice(1))
      expect(existsSync(path.join(carpeta, 'route.ts')), ruta).toBe(true)
    }
  })
})
