// Entrada del módulo para Client Components: los tipos, lo puro que resuelve un arte con sus datos (`entities/datos/`: el texto de una capa con
// sus líneas vacías, las capas con datos y lo que falta) y la elección del vehículo de ejemplo en el `localStorage` (`recordarElEjemplo`: deja
// elegido el ejemplo antes de abrir el editor de una plantilla).
export {
  capasConDatos,
  tieneDatos,
  type CapaResuelta,
  type CapasConDatos,
  type Falta,
} from './entities/datos/capas-con-datos'
export { claveDelEjemplo, type EjemploElegido } from './entities/datos/ejemplo-elegido'
export { textoDeLoQueFalta } from './entities/datos/lo-que-falta'
export { quedoVacio, resolverTexto, type TextoResuelto } from './entities/datos/resolver-texto'
export type { DatosDelArte, FijosDelArte, TipoDeOrigenDelArte } from './entities/datos/tipos'
export { valoresDelArte, type ValoresDelArte } from './entities/datos/valores-del-arte'
export {
  variablesDelArte,
  type CampoDelArte,
  type CatalogoDelArte,
} from './entities/datos/variables-del-arte'
export type { ClaveDeFormato, TipoDeArte } from './entities/formatos'
export type { ImagenDeArte, PlantillaDeArte } from './entities/tipos'
export { recordarElEjemplo } from './features/editor/hooks/ejemplo-recordado'
