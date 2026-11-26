// Lo que el núcleo de `logistica` dibuja en el panel de un ítem de repuesto (8.13-2): «Qué falta» con su `?destino=`, las tarjetas de Documentos, Notas e Historial (cada una abre su hueco en un
// drawer) y la cabecera de la unidad. `src/app` las pone donde las quiere `repuestos` (el panel del ítem, en dos columnas). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { CabeceraDeLaUnidad } from '../features/nucleo/components/cabecera-de-la-unidad'
export { QueFaltaDelItem } from '../features/nucleo/components/que-falta-del-item'
export { TarjetaDelHuecoDelItem } from '../features/nucleo/components/tarjeta-del-hueco-del-item'
