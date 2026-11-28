// Cómo el inspector del editor de artes cambia las capas elegidas y el fondo: los cambios seguidos de un campo sobre las mismas capas son un
// solo paso del historial (la misma clave dentro de `ESPERA_DE_LA_FUSION_MS`). En sólo lectura no despacha nada.
import type { CapaDeArte, FondoDeArte } from '../../../../entities/documento'
import { claveDeFusion } from '../../../../entities/editor/inspector'
import type { EditorDeArte } from '../../tipos'

export type CambioDeCapa = (capa: CapaDeArte) => CapaDeArte

export function cambiarLasCapas(
  editor: EditorDeArte,
  ids: readonly string[],
  campo: string,
  cambio: CambioDeCapa,
) {
  if (editor.soloLectura) {
    return
  }
  editor.despachar({
    tipo: 'cambiar',
    ids,
    cambio,
    fusion: { clave: claveDeFusion(campo, ids), en: Date.now() },
  })
}

export function moverLasCapas(
  editor: EditorDeArte,
  ids: readonly string[],
  dx: number,
  dy: number,
) {
  if (editor.soloLectura || (dx === 0 && dy === 0)) {
    return
  }
  editor.despachar({
    tipo: 'mover',
    ids,
    dx,
    dy,
    fusion: { clave: claveDeFusion('mover', ids), en: Date.now() },
  })
}

export function cambiarElFondo(editor: EditorDeArte, campo: string, fondo: FondoDeArte) {
  if (editor.soloLectura) {
    return
  }
  editor.despachar({
    tipo: 'fondo',
    fondo,
    fusion: { clave: claveDeFusion(`fondo-${campo}`, []), en: Date.now() },
  })
}
