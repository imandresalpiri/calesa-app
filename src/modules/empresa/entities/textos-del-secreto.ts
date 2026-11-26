import type { ClaveIntegracion } from './integraciones'

// Las integraciones con secreto y lo que dice cada una. El secreto va a Vault y no vuelve: de él sólo se sabe cuándo se guardó.
export const TEXTOS_DEL_SECRETO = {
  apibara: {
    modal: 'clave-apibara',
    nombre: 'secreto',
    cargar: 'Cargar la clave',
    reemplazar: 'Reemplazar la clave',
    etiqueta: 'Clave',
    etiquetaNueva: 'Clave nueva',
    exito: 'Clave de apibara guardada',
    vacio: 'Todavía no hay una clave guardada.',
    guardado: 'Guardada el',
  },
  asistente_ia: {
    modal: 'clave-asistente-ia',
    nombre: 'secreto',
    cargar: 'Cargar la clave',
    reemplazar: 'Reemplazar la clave',
    etiqueta: 'Clave',
    etiquetaNueva: 'Clave nueva',
    exito: 'Clave del asistente guardada',
    vacio: 'Todavía no hay una clave guardada.',
    guardado: 'Guardada el',
  },
  web_publica: {
    modal: 'secreto-web-publica',
    nombre: 'secretoDeRevalidacion',
    cargar: 'Cargar el secreto',
    reemplazar: 'Reemplazar el secreto',
    etiqueta: 'Secreto',
    etiquetaNueva: 'Secreto nuevo',
    exito: 'Secreto de revalidación guardado',
    vacio: 'Todavía no hay un secreto guardado.',
    guardado: 'Guardado el',
  },
} as const satisfies Partial<Record<ClaveIntegracion, Record<string, string>>>

export type ClaveConSecreto = keyof typeof TEXTOS_DEL_SECRETO
