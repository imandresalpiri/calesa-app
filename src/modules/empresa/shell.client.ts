// La entrada del SHELL del módulo `empresa` para Client Components de `src/app/(app)/_shell/`: lo que el modal de «Ayuda» del menú del
// perfil lee y arma. Sólo lo importa ese modal, que va diferido: lo que importa el shell viaja en el JS de **todas** las pantallas
// (`docs/RENDIMIENTO.md`).
export { leerMisEnlacesDeAyuda } from './composicion-ayuda.client'
export { armarMisEnlaces, type EnlaceDeAyudaDelMenu } from './entities/mis-enlaces-de-ayuda'
export {
  PANEL_DE_ENLACES_DE_AYUDA,
  PANEL_NUEVO_ENLACE_PROPIO,
} from './entities/paneles-de-enlaces-de-ayuda'
