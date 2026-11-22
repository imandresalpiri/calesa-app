// Las vistas del editor de la hoja (es el valor de `?vista=`): el celular (412 px), la laptop (1280), la pantalla grande (1920) y el celular con el texto al
// doble (`200`: 206 px con `zoom: 2`). Se edita en cualquiera. Sin `?vista=`, la que corresponde al ancho de la ventana (`vistaParaLaPantalla()`).
export const ANCHOS_DE_LA_VISTA_PREVIA = ['412', '1280', '1920', '200'] as const
export type AnchoDeLaVistaPrevia = (typeof ANCHOS_DE_LA_VISTA_PREVIA)[number]

export const NOMBRES_DE_LAS_VISTAS: Record<AnchoDeLaVistaPrevia, string> = {
  '412': 'Celular',
  '1280': 'Laptop',
  '1920': 'Grande',
  '200': 'Texto al 200 %',
}

// Desde qué ancho de ventana se edita (el de la pestaña Tarjeta): por debajo, la hoja a 412 en sólo lectura.
export const ANCHO_DEL_EDITOR_DE_LA_HOJA = '(min-width: 1024px)'
export const SOLO_EN_PANTALLA_ANCHA = 'Este editor se usa en una pantalla de al menos 1.024 px.'

// Lo que mide el hijo que se dibuja (en px) y su zoom: «Texto al 200 %» es un celular de 412 con la letra al doble, o sea 206 px al doble.
export const MEDIDAS_DE_LAS_VISTAS: Record<AnchoDeLaVistaPrevia, { ancho: number; zoom: number }> =
  {
    '412': { ancho: 412, zoom: 1 },
    '1280': { ancho: 1280, zoom: 1 },
    '1920': { ancho: 1920, zoom: 1 },
    '200': { ancho: 206, zoom: 2 },
  }

// La vista sin `?vista=`: la grande con una ventana de 1920 px o más, la laptop desde 1280 y, si no, el celular (que se sigue editando desde 1024).
export function vistaParaLaPantalla(anchoDeLaVentana: number): AnchoDeLaVistaPrevia {
  if (anchoDeLaVentana >= 1920) return '1920'
  return anchoDeLaVentana >= 1280 ? '1280' : '412'
}

// Cuánto se achica el lienzo para entrar en lo disponible (nunca agranda). Sin medida todavía, sin achicar.
export function escalaDelLienzo(vista: AnchoDeLaVistaPrevia, disponible: number): number {
  const { ancho, zoom } = MEDIDAS_DE_LAS_VISTAS[vista]
  const mide = ancho * zoom
  return disponible > 0 && mide > disponible ? disponible / mide : 1
}
