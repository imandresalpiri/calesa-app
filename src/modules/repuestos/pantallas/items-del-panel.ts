// Pantalla del área `items` de `repuestos`: lo del panel de un ítem (`?item=<id>`, en la hoja del proyecto y en la Cadena) que dibuja el área: el marco de dos columnas, la columna izquierda (los
// grupos del ítem) y la tarjeta «Imágenes». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export {
  ColumnaDelItemDiferida,
  ItemEnDosColumnasDiferido,
  TarjetaDeImagenesDiferida,
  TarjetaDeVehiculoYClienteDiferida,
} from '../features/items/components/diferidos'
export type { LecturaDelItem } from '../features/items/components/columna-del-item'
