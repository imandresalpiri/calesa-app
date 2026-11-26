// Por qué algo de la empresa aparece deshabilitado. Lo que la persona espera poder hacer no se
// esconde: se muestra apagado y se dice el motivo (docs/UX.md › Reglas transversales).
import { TOPE_EN_LA_BARRA } from './tipos-cambio'

export const MOTIVO_SIN_PERMISO_AJUSTES =
  'Puedes ver los ajustes de la empresa, pero no tienes permiso para cambiarlos.'

export const MOTIVO_SIN_PERMISO_TIPOS_CAMBIO =
  'Puedes ver las monedas y los tipos de cambio, pero no tienes permiso para cambiarlos.'

export const MOTIVO_SIN_PERMISO_HISTORIAL = 'El historial lo ve quien gestiona los tipos de cambio.'

export const MOTIVO_TOPE_EN_LA_BARRA = `Ya hay ${TOPE_EN_LA_BARRA} en la barra superior: quita uno para sumar este.`

export const MOTIVO_INACTIVO_EN_LA_BARRA =
  'Un tipo de cambio inactivo no se ve en la barra superior.'

export const MOTIVO_FUERA_DEL_TOPE_DE_LA_BARRA = `Está marcado, pero ya se ven ${TOPE_EN_LA_BARRA} antes que este: quita uno para que se vea.`

export const MOTIVO_MONEDA_BASE_CON_DATOS =
  'La moneda base no se cambia con datos cargados: los montos ya están guardados en ella.'

export const MOTIVO_SIN_LOGO = 'Carga el logo y guarda: los íconos se dibujan a partir de él.'

export const MOTIVO_SIN_SECRETO = 'Guarda la clave antes de activarla.'

export const MOTIVO_SIN_USO_SIN_CLAVE = 'Guarda la clave para ver el uso.'

export const MOTIVO_INTEGRACION_NO_INSTALADA = 'Esta integración no está en la instalación.'

export const MOTIVO_PROBAR_SIN_DIRECCION = 'Guarda la dirección para probar.'

export const MOTIVO_PROBAR_SIN_SECRETO = 'Guarda el secreto para probar.'

export const MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE = 'Carga la clave para probar.'

export const MOTIVO_ACTIVAR_SIN_CLAVE = 'Carga la clave para activarlo.'

export const MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION =
  'Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.'
