import { describe, expect, it } from 'vitest'
import { textoDeLasImagenesQueFaltan, textoDelFalloDelPdf } from './fallo-del-pdf'

describe('textoDelFalloDelPdf', () => {
  it('dice lo que pasó con un texto propio por código', () => {
    expect(textoDelFalloDelPdf('no_encontrado')).toBe('Esta cotización ya no está disponible.')
    expect(textoDelFalloDelPdf('no_autenticado')).toBe('Tu sesión ya no vale: vuelve a entrar.')
    expect(textoDelFalloDelPdf('inesperado')).toBe('No se pudo armar el PDF.')
    expect(textoDelFalloDelPdf('sin_permiso')).toBe('No se pudo armar el PDF.')
  })
})

describe('textoDeLasImagenesQueFaltan', () => {
  it('sin ninguna no avisa; con una o más, cuántas', () => {
    expect(textoDeLasImagenesQueFaltan(0)).toBeNull()
    expect(textoDeLasImagenesQueFaltan(1)).toBe('El PDF salió sin 1 imagen que no cargó.')
    expect(textoDeLasImagenesQueFaltan(3)).toBe('El PDF salió sin 3 imágenes que no cargaron.')
  })
})
