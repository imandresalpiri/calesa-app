// El registro de un cambio en la frase de la actividad: su icono por tipo, cómo se nombra cuando no hay título (borrado, sin acceso o de
// configuración) y a qué página lleva. La base da el título y el destino (`actividad_listar` › `registro_titulo`, `registro_destino`); acá sólo
// se decide cómo se dice y a dónde va. Las claves son las tablas de `ENTIDADES_DE_LA_ACTIVIDAD`.
import {
  contenedorDeLogistica,
  embarqueDeLogistica,
  RUTAS,
  unidadDeLogistica,
} from '@/shared/lib/rutas'
import type { DestinoDelRegistro, FilaDeActividad } from './actividad'

export type IconoDeEntidad =
  | 'lead'
  | 'vehiculo'
  | 'cotizacion'
  | 'comprobante'
  | 'aduana'
  | 'documento'
  | 'gasto'
  | 'pago'
  | 'transporte'
  | 'repuestos'
  | 'formula'
  | 'configuracion'
  | 'otro'

type Entidad = {
  icono: IconoDeEntidad
  // Sin título: «un vehículo», «una fase», «los ajustes de la web».
  enFrase: string
  // La página de Configuración de una tabla de configuración (o de la fórmula).
  configuracion?: string
  // El título es el de la unidad de la que cuelga: «un gasto de Toyota Hilux #12».
  deUnaUnidad?: true
}

const ENTIDADES: Readonly<Record<string, Entidad>> = {
  leads: { icono: 'lead', enFrase: 'un lead' },
  vehiculos: { icono: 'vehiculo', enFrase: 'un vehículo' },
  cotizaciones: { icono: 'cotizacion', enFrase: 'una cotización' },
  comprobantes: { icono: 'comprobante', enFrase: 'un comprobante' },
  declaraciones_aduana: { icono: 'aduana', enFrase: 'una declaración aduanera' },
  documentos: { icono: 'documento', enFrase: 'un documento', deUnaUnidad: true },
  gastos: { icono: 'gasto', enFrase: 'un gasto', deUnaUnidad: true },
  pagos: { icono: 'pago', enFrase: 'un pago', deUnaUnidad: true },
  transportes: { icono: 'transporte', enFrase: 'un transporte', deUnaUnidad: true },
  embarques: { icono: 'transporte', enFrase: 'un embarque' },
  contenedores: { icono: 'transporte', enFrase: 'un contenedor' },
  repuestos_compras: { icono: 'repuestos', enFrase: 'una compra', deUnaUnidad: true },
  repuestos_items: { icono: 'repuestos', enFrase: 'un ítem de repuesto' },
  formulas: {
    icono: 'formula',
    enFrase: 'una fórmula',
    configuracion: RUTAS.origenes,
  },
  formulas_del_origen: {
    icono: 'formula',
    enFrase: 'una fórmula del origen',
    configuracion: RUTAS.origenes,
  },
  ajustes_empresa: {
    icono: 'configuracion',
    enFrase: 'los datos de la empresa',
    configuracion: RUTAS.empresa,
  },
  ajustes_web: {
    icono: 'configuracion',
    enFrase: 'los ajustes de la web',
    configuracion: RUTAS.configuracionDeWeb,
  },
  ajustes_leads: {
    icono: 'configuracion',
    enFrase: 'los ajustes de leads',
    configuracion: RUTAS.configuracionDeLeads,
  },
  categorias: { icono: 'configuracion', enFrase: 'una categoría', configuracion: RUTAS.origenes },
  cola_web_asesores: {
    icono: 'configuracion',
    enFrase: 'la cola web',
    configuracion: RUTAS.configuracionDeColaWeb,
  },
  fases: {
    icono: 'configuracion',
    enFrase: 'una fase',
    configuracion: RUTAS.origenes,
  },
  fases_requisitos: {
    icono: 'configuracion',
    enFrase: 'un requisito',
    configuracion: RUTAS.origenes,
  },
  fases_transiciones: {
    icono: 'configuracion',
    enFrase: 'una transición',
    configuracion: RUTAS.origenes,
  },
  integraciones: {
    icono: 'configuracion',
    enFrase: 'una integración',
    configuracion: RUTAS.empresa,
  },
  flujos: {
    icono: 'configuracion',
    enFrase: 'el flujo de un origen',
    configuracion: RUTAS.origenes,
  },
  leads_campos: {
    icono: 'configuracion',
    enFrase: 'un campo de lead',
    configuracion: RUTAS.camposDeLeads,
  },
  leads_campos_grupos: {
    icono: 'configuracion',
    enFrase: 'un grupo de campos de lead',
    configuracion: RUTAS.camposDeLeads,
  },
  origenes: { icono: 'configuracion', enFrase: 'un origen', configuracion: RUTAS.origenes },
  origenes_campos: {
    icono: 'configuracion',
    enFrase: 'el layout de campos de un origen',
    configuracion: RUTAS.origenes,
  },
  origenes_campos_grupos: {
    icono: 'configuracion',
    enFrase: 'un grupo de campos de un origen',
    configuracion: RUTAS.origenes,
  },
  origenes_lead: {
    icono: 'configuracion',
    enFrase: 'un origen del lead',
    configuracion: `${RUTAS.configuracionDeLeads}?panel=origenes`,
  },
  plantillas_tarjeta: {
    icono: 'configuracion',
    enFrase: 'una plantilla de tarjeta',
    configuracion: RUTAS.origenes,
  },
  roles_permisos: { icono: 'configuracion', enFrase: 'una concesión', configuracion: RUTAS.roles },
  tipos_cambio: {
    icono: 'configuracion',
    enFrase: 'un tipo de cambio',
    configuracion: RUTAS.empresa,
  },
  tipos_lead: {
    icono: 'configuracion',
    enFrase: 'un tipo de lead',
    configuracion: `${RUTAS.configuracionDeLeads}?panel=tipos`,
  },
  tipos_seguimiento: {
    icono: 'configuracion',
    enFrase: 'un tipo de seguimiento',
    configuracion: `${RUTAS.configuracionDeLeads}?panel=seguimientos`,
  },
  usuarios_roles: {
    icono: 'configuracion',
    enFrase: 'el rol de una persona',
    configuracion: RUTAS.equipo,
  },
}

export function iconoDeEntidad(tabla: string): IconoDeEntidad {
  return ENTIDADES[tabla]?.icono ?? 'otro'
}

// Una tabla que la actividad no muestra (roles, papelera, perfiles…): «un registro».
export function entidadEnFrase(tabla: string): string {
  return ENTIDADES[tabla]?.enFrase ?? 'un registro'
}

export function cuelgaDeUnaUnidad(tabla: string): boolean {
  return ENTIDADES[tabla]?.deUnaUnidad === true
}

type ParaEnlazar = Pick<
  FilaDeActividad,
  'tabla' | 'registroId' | 'registroTitulo' | 'registroDestino'
>

// La página de lo que cuelga de otra cosa: la cotización de un comprobante, la unidad de logística de un vehículo o la hoja del proyecto de
// repuestos (con el ítem abierto, si lo hay).
function enlaceDelDestino(destino: DestinoDelRegistro): string | null {
  if (destino.cotizacionId) {
    return `${RUTAS.cotizaciones}/${destino.cotizacionId}`
  }
  if (destino.vehiculoId) {
    return unidadDeLogistica(destino.vehiculoId)
  }
  if (destino.proyectoId) {
    const proyecto = `${RUTAS.repuestos}/${destino.proyectoId}`
    return destino.itemId ? `${proyecto}?item=${destino.itemId}` : proyecto
  }
  return null
}

// La página de un registro por su id, en las entidades que tienen una propia.
const PAGINA_PROPIA: Readonly<Record<string, (id: string) => string>> = {
  leads: (id) => `${RUTAS.leads}/${id}`,
  vehiculos: (id) => `${RUTAS.vehiculos}/${id}`,
  cotizaciones: (id) => `${RUTAS.cotizaciones}/${id}`,
  declaraciones_aduana: (id) => `${RUTAS.aduana}?declaracion=${id}`,
  // Sin el origen: la página del embarque y el drawer del contenedor lo toman de la entidad.
  embarques: (id) => embarqueDeLogistica(id),
  contenedores: (id) => contenedorDeLogistica(id),
}

// La página del registro de una fila visible: la de Configuración para lo de configuración; para lo demás, sólo si la base dio su título
// (existe y quien mira lo ve). Lo que cuelga de una unidad va a la unidad.
export function enlaceDelRegistro(fila: ParaEnlazar): string | null {
  const configuracion = ENTIDADES[fila.tabla]?.configuracion
  if (configuracion !== undefined) {
    return configuracion
  }
  if (fila.registroTitulo === null || fila.registroId === null) {
    return null
  }
  if (fila.registroDestino !== null) {
    return enlaceDelDestino(fila.registroDestino)
  }
  return PAGINA_PROPIA[fila.tabla]?.(encodeURIComponent(fila.registroId)) ?? null
}
