// Sobre qué versión trabaja el editor de la hoja (el borrador o la publicada que leyó la pestaña) y cuándo una lectura nueva pide montarlo otra vez. Puras.
export type VersionDelEditor = { estado: 'borrador' | 'publicada'; id: string } | null

export const mismaVersionDelEditor = (antes: VersionDelEditor, ahora: VersionDelEditor): boolean =>
  antes?.estado === ahora?.estado && antes?.id === ahora?.id

// La versión cambió por algo que el editor no hizo (publicar o descartar el borrador, u otra persona): otro editor, sobre la nueva. Su propio guardado (de la
// publicada al borrador que crea, o el mismo borrador con otra hora) no lo vuelve a montar.
export function pideOtroEditor(antes: VersionDelEditor, ahora: VersionDelEditor): boolean {
  if (mismaVersionDelEditor(antes, ahora)) return false
  return !(antes?.estado === 'publicada' && ahora?.estado === 'borrador')
}
