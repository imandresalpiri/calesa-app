import { describe, expect, it } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'
import { rutaDeLasImagenesDelItem } from './paneles'

describe('rutaDeLasImagenesDelItem', () => {
  it('lleva a la hoja del proyecto con el panel de imágenes del ítem', () => {
    expect(rutaDeLasImagenesDelItem('p1', 'i1')).toBe(
      `${RUTAS.repuestos}/p1?panel=imagenes&item=i1`,
    )
  })
})
