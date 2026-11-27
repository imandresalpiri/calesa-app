// La entrada de CLIENTE del módulo `equipo`: lo que puede importar un Client Component de `app/`
// o de otro módulo (`@/modules/equipo/client`). Sólo hooks, componentes de cliente o puros, y
// tipos de `entities/`. Nada de servidor: para eso está `index.ts`.
export { RoleBadge } from './features/roles/components/role-badge'
export { usePerspectiva } from './features/perspectiva/hooks/use-perspectiva'
export type { Perspectiva, RolParaVerComo } from './entities/perspectiva'

// Vistas guardadas de un listado: el menú que las aplica, las guarda y las elimina.
export { VistasGuardadas } from './features/vistas/components/vistas-guardadas'
export type { ParamsDeVista, VistaGuardada } from './entities/vista'

// Las preferencias de la persona que se guardan desde otra pantalla (`tablero.widgets`, `vehiculos.vista`, `cotizaciones.vista`, `embarques.vista`, `cotizaciones.agrupar`, `leads.embudo_de_la_ficha`, `logistica.ultimo_origen`): la acción valida con `esquemaPreferencia` y escribe sólo en la fila de quien
// actúa (la RLS lo repite); aquí sólo se reexporta, como `completarRecordatorio` en `leads/client.ts`.
export { guardarPreferencia } from './features/perfil/actions/guardar-preferencia'
// La última pestaña abierta en un origen: la escribe la barra de pestañas al cambiar (sin aviso si falla).
export { recordarLaPestana } from './features/perfil/actions/recordar-la-pestana'
export {
  CLAVE_DE_AGRUPAR_COTIZACIONES,
  CLAVE_DE_EMBUDO_DE_LA_FICHA,
  CLAVE_DE_VISTA_DE_COTIZACIONES,
  CLAVE_DE_VISTA_DE_EMBARQUES,
  CLAVE_DE_VISTA_DE_VEHICULOS,
  CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA,
  CLAVE_WIDGETS_DEL_TABLERO,
  type WidgetsDelTablero,
} from './entities/preferencias'
// «Visto» y «último visto» de las listas (por persona y módulo): las marcas de una página, el registro al abrir y la preferencia.
export { useVistos } from './features/vistos/hooks/use-vistos'
export { RegistrarVisto } from './features/vistos/components/registrar-visto'
export { usePreferenciaDeVistos } from './features/vistos/components/proveedor-de-vistos'
export type { MarcaDeVisto, ModuloDeVistos, TipoDeVistos } from './entities/vistos'
export { ProveedorDeMarcasDeVisto } from './features/vistos/components/marcas-de-visto'
