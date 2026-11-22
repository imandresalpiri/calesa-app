// API pública del módulo `empresa` para el servidor: lecturas, reglas y tipos. Lo importan los Server
// Components y otros módulos. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo que
// importa): los de Configuración › Empresa salen por `pantallas/configuracion-empresa.ts` (sólo `src/app`) y
// los del marco de toda pantalla, por `shell.ts`.

// Lo mínimo de la empresa en toda pantalla, también antes de ingresar
export { registroDisponible, type Ajustes } from './entities/ajustes'
export { getAjustes } from './composicion'

// Configuración › Empresa: marca, datos legales, región y políticas
export { leerAjustes, leerMonedasYTiposCambio } from './composicion'
export { type PoliticaDeLimpieza } from './entities/ajustes-empresa'
// La limpieza automática de vehículos de subasta: si está encendida y cuántos días de gracia. No
// tumba la pantalla (sin poder leerla, se da por apagada).
export { getPoliticaDeLimpieza } from './composicion'
export { zonasHorarias } from './entities/regional'

// Monedas y tipos de cambio nombrados
export { getTiposCambio, leerHistorial, leerUltimosCambios } from './composicion'
export type { TipoCambio } from './entities/tipos-cambio'

// Configuración › Orígenes › «Para todos los orígenes» › Vigencia (4.20-4b): la vigencia de las cotizaciones
export { leerAjustesDeCotizacion } from './composicion'
export { puedeCambiarAjustesDeCotizacion } from './entities/ajustes-de-cotizacion'
export type { AjustesDeCotizacion } from './entities/ajustes-de-cotizacion'
export { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from './entities/motivos'

// Compartir los tipos de cambio con un cliente: las rutas `/tipos-de-cambio/texto` y `/tipos-de-cambio/imagen` (sesión y ids de la URL) y la leyenda
export { leerLeyendaDeTiposCambio, responderCompartirTiposCambio } from './composicion'
export type { FormatoParaCompartir } from './features/compartir-tipos-cambio/responder'

// Integraciones: el interruptor, lo no secreto y si están prendidas
export { integracionActiva, leerIntegraciones, leerVehiculosQueCambian } from './composicion'
export type { ClaveIntegracion } from './entities/integraciones'

// El tope de lo que pesa un logo en Storage (1 MB): el PDF de una cotización no baja uno más pesado (4.18-3a)
export { PESO_MAXIMO_LOGO } from './entities/marca'

// Íconos de la app generados desde el logo
export { claveDeIconoVigente, iconosDelManifest, urlDeIcono } from './entities/iconos'
