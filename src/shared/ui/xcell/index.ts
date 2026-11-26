// La celda de la hoja de cotizar (4.12) y lo que la acompaña: los tonos de la empresa y los iconos, que se montan una vez por hoja.
export { XCell, type XCellProps } from './xcell'
export { EstiloDeTonos } from './estilo-de-tonos'
export { SimbolosDeXCell } from './simbolos-de-xcell'
export type { FormatoDeXCell } from './estado'
// Lo que dice una celda cuando no se edita (con sus «Decimales», si los tiene), para otra superficie que muestre una cifra igual que la XCell.
export { TextoDeValor } from './texto-de-valor'
export type { Tono } from './tonos'
// El estilo de lo editable (el botón del valor y la entrada que lo reemplaza, con el color de `--tono-*`), para otra superficie que marque sus celdas
// editables como la XCell; y la celda densa de una tabla (la hoja de ítems de `repuestos`), que va en el contenedor de sus celdas.
export { BOTON_DEL_VALOR, ENTRADA, XCELL_COMPACTA } from './clases'
