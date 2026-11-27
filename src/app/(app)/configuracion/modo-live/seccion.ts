import { RadioTowerIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Modo Live en el hub: qué se ve con el Live encendido, por rol y por persona. Se abre con `live.configurar`. El tipo se
// trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_MODO_LIVE = {
  clave: 'modo-live',
  titulo: 'Modo Live',
  descripcion: 'Qué se ve al compartir la pantalla, por rol y por persona.',
  palabras: ['live', 'en vivo', 'transmitir', 'compartir pantalla', 'ocultar', 'presentar'],
  ruta: RUTAS.modoLive,
  Icono: RadioTowerIcon,
  permisos: ['live.configurar'],
  grupo: 'empresa-y-equipo',
  subsecciones: [],
} as const satisfies SeccionDeConfiguracion
