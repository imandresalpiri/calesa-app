// Por qué algo del editor de campos aparece deshabilitado. Lo que la persona espera poder hacer no
// se esconde: se muestra apagado y se dice el motivo (docs/UX.md › Reglas transversales).

export const MOTIVO_CAMPO_DE_FABRICA =
  'Es un campo de fábrica: su clave y su tipo no cambian y no se elimina. Puedes desactivarlo.'

export const MOTIVO_PRIMERO_DE_SU_GRUPO = 'Ya es el primero de su grupo.'
export const MOTIVO_ULTIMO_DE_SU_GRUPO = 'Ya es el último de su grupo.'

// Al soltar un campo en otro grupo: arrastrar sólo ordena; el grupo se elige en el panel del campo.
export const MOTIVO_OTRO_GRUPO =
  'Sólo se ordena dentro de su grupo; el grupo se cambia en el campo.'
