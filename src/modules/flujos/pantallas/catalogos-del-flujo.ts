// Pantalla del núcleo de `flujos`: lo que necesita el drawer de los catálogos que `src/app` pone en la barra del flujo (qué hacer con su `?panel=`, qué
// claves limpiar al abrirlo y al cerrarlo, y la acción que abre «Nuevo tipo de documento»). Puro y de cliente; sólo `src/app` importa este archivo.
export {
  ACCION_NUEVO_TIPO,
  CLAVE_DE_ACCION,
  CLAVES_DEL_DRAWER_DE_CATALOGO,
  consultaParaAbrirUnCatalogo,
  queHacerConElPanel,
} from '../entities/panel-del-flujo'
