// La barra de arriba de toda página de Logística (núcleo de `logistica`): la fila de pestañas de origen. La segunda fila (las pestañas del origen) y el ⚙ los
// dibuja `src/app/(app)/logistica/barra-de-logistica.tsx` en el servidor. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export {
  PestanasDeOrigen,
  type PestanaDeOrigen,
} from '../features/nucleo/components/pestanas-de-origen'
// Las rutas de las pestañas: una ruta de Logística en un origen (`?origen=`).
export { enElOrigen } from '../entities/nucleo/enlaces'
