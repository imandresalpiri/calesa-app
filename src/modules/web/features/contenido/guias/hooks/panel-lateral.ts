// Si el panel de la derecha de la guía se ve o no, recordado en el navegador (`localStorage`, clave `guia:panel`: '1' abierto, '0' cerrado). Un
// navegador sin almacenamiento (modo privado, bloqueado) no rompe nada: el panel queda abierto y no se recuerda.
export const CLAVE_DEL_PANEL_DE_LA_GUIA = 'guia:panel'

type Almacen = Pick<Storage, 'getItem' | 'setItem'>

export function leerPanelDeLaGuia(almacen: Almacen | null): boolean {
  try {
    return almacen?.getItem(CLAVE_DEL_PANEL_DE_LA_GUIA) !== '0'
  } catch {
    return true
  }
}

export function escribirPanelDeLaGuia(almacen: Almacen | null, abierto: boolean): void {
  try {
    almacen?.setItem(CLAVE_DEL_PANEL_DE_LA_GUIA, abierto ? '1' : '0')
  } catch {
    // Sin almacenamiento no se recuerda: el panel igual cambia en esta pantalla.
  }
}
