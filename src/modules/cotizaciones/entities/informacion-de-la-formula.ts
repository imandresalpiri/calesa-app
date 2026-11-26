// La información de la fórmula (docs/GLOSARIO.md): el modal con la publicada, el borrador y los avisos de la copia, que se abre desde el botón ⓘ junto al estado
// de la barra de la fórmula. Va en el núcleo porque lo nombran el área `formula` (el botón y el modal) y `formulas-del-origen` (abrirlo tras copiar). Puro.

// `?panel=info-formula`: el modal «Información de la fórmula», en la pestaña Planilla.
export const PANEL_DE_LA_INFORMACION = 'info-formula'

type Args = {
  conPublicada: boolean
  // Hay un borrador y, desde que empezó, se publicó otra versión (`borradorAtrasado()`).
  atrasado: boolean
  // Hay avisos de la copia sin ocultar.
  conAvisos: boolean
  // El nombre del origen, para decir que sin publicada no se cotiza en él.
  origen: string
}

// La marca de aviso del botón: lo que bloquea no se esconde detrás del modal. Primero, sin publicada (no se cotiza); después, un borrador atrasado (no se
// publica); por último, avisos de la copia pendientes. Nula: nada que marcar.
export function marcaDeLaInformacion({
  conPublicada,
  atrasado,
  conAvisos,
  origen,
}: Args): { texto: string } | null {
  if (!conPublicada) {
    return { texto: `${origen} no tiene una versión publicada: no se puede cotizar en él.` }
  }
  if (atrasado) return { texto: 'El borrador quedó atrasado: no se puede publicar.' }
  return conAvisos ? { texto: 'Hay avisos de la copia.' } : null
}
