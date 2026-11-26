// Cómo se nombra lo que dice la actividad: la entidad con el término de `docs/GLOSARIO.md`, la acción por su sufijo, cada campo con su
// etiqueta y quién lo hizo. Sin etiqueta, el nombre crudo humanizado: nunca se esconde un cambio por no tener nombre.
import type { FilaDeActividad } from './actividad'

// Espejo de las tablas declaradas en `_actividad_recorte` (supabase/migrations/…_actividad_diff.sql): una tabla nueva ahí, una línea aquí.
export const ENTIDADES_DE_LA_ACTIVIDAD: Readonly<Record<string, string>> = {
  leads: 'Lead',
  vehiculos: 'Vehículo',
  cotizaciones: 'Cotización',
  comprobantes: 'Comprobante',
  declaraciones_aduana: 'Declaración aduanera',
  documentos: 'Documento',
  gastos: 'Gasto',
  pagos: 'Pago',
  transportes: 'Transporte',
  embarques: 'Embarque',
  contenedores: 'Contenedor',
  repuestos_compras: 'Compra',
  repuestos_items: 'Ítem de repuesto',
  ajustes_empresa: 'Empresa',
  ajustes_web: 'Ajustes de la web',
  ajustes_leads: 'Ajustes de leads',
  categorias: 'Categoría',
  cola_web_asesores: 'Cola web',
  flujos: 'Flujo',
  fases: 'Fase',
  fases_requisitos: 'Requisito',
  fases_transiciones: 'Transición',
  formulas: 'Fórmula',
  formulas_del_origen: 'Fórmula del origen',
  integraciones: 'Integración',
  leads_campos: 'Campo de lead',
  origenes: 'Origen',
  origenes_campos: 'Layout de campos',
  origenes_lead: 'Origen del lead',
  plantillas_tarjeta: 'Plantilla de tarjeta',
  roles_permisos: 'Concesión',
  tipos_cambio: 'Tipo de cambio',
  tipos_lead: 'Tipo de lead',
  tipos_seguimiento: 'Tipo de seguimiento',
  usuarios_roles: 'Rol de una persona',
}

const CAMPOS_COMUNES: Readonly<Record<string, string>> = {
  nombre: 'Nombre',
  titulo: 'Título',
  privada: 'Privada',
  estado: 'Estado',
  notas: 'Notas',
  activo: 'Activo',
  orden: 'Orden',
  clave: 'Clave',
  origen_id: 'Origen',
  fase_id: 'Fase',
  lead_id: 'Lead',
  vehiculo_id: 'Vehículo',
  repuesto_id: 'Ítem de repuesto',
  cotizacion_id: 'Cotización',
  categoria_id: 'Categoría',
  creado_por: 'Creado por',
  creado_en: 'Creado',
  eliminado_en: 'Enviado a la papelera',
  lote_papelera_id: 'Lote de papelera',
  moneda: 'Moneda',
  monto: 'Monto',
  monto_base: 'Monto en moneda base',
  fecha: 'Fecha',
  descripcion: 'Descripción',
  atributos: 'Atributos',
  atributos_publicos: 'Atributos públicos',
}

// Lo que es del embarque (o, sin embarque, de la unidad o del contenedor).
const DATOS_DEL_EMBARQUE: Readonly<Record<string, string>> = {
  naviera_id: 'Naviera',
  puerto_origen_id: 'Puerto de origen',
  puerto_destino_id: 'Puerto de destino',
  zarpe_el: 'Zarpe',
  eta_el: 'ETA',
  arribo_el: 'Arribo',
}

const CAMPOS_POR_TABLA: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  transportes: { ...DATOS_DEL_EMBARQUE, embarque_id: 'Embarque', contenedor_id: 'Contenedor' },
  embarques: { ...DATOS_DEL_EMBARQUE, booking: 'Booking', zarpe_estimado_el: 'Zarpe estimado' },
  contenedores: {
    numero: 'Número',
    tipo: 'Tipo de contenedor',
    sello: 'Sello',
    embarque_id: 'Embarque',
  },
  leads: {
    telefono_cc: 'Código de país',
    tipo_lead_id: 'Tipo de lead',
    origen_lead_id: 'Origen del lead',
    ultimo_seguimiento_en: 'Último seguimiento',
  },
  vehiculos: {
    precio: 'Precio',
    precio_web: 'Precio público',
    precio_web_hasta: 'Precio público hasta',
    publicado_web: 'Publicado',
    lote: 'Lote de subasta',
    situacion: 'Situación',
    subasta_resultado: 'Resultado de la subasta',
    subasta_resuelta_en: 'Subasta resuelta el',
    subasta_resuelta_por: 'Subasta resuelta por',
  },
  cotizaciones: {
    total_base: 'Total en moneda base',
    titulo_manual: 'Título manual',
    tarjeta_retoques: 'Retoques de la tarjeta',
  },
  repuestos_items: { precio_cliente: 'Precio al cliente' },
}

// «precio_web_nota» → «Precio web nota».
function humanizar(clave: string): string {
  const texto = clave.replace(/[._]+/g, ' ').trim()
  return texto.length === 0 ? clave : texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function etiquetaDeEntidad(tabla: string): string {
  return ENTIDADES_DE_LA_ACTIVIDAD[tabla] ?? tabla
}

// Las de `registrar_actividad()` que se ven en la actividad, dichas como lo que va antes del registro en la frase («Ana aprobó Cotización #34»,
// «Ana resolvió la subasta de Toyota Hilux #12»).
const VERBOS: Readonly<Record<string, string>> = {
  'vehiculo.subasta_resuelta': 'Resolvió la subasta de',
  'vehiculo.vitrina': 'Cambió la vitrina de',
  'comprobante.emitido': 'Emitió',
  'comprobante.anulado': 'Anuló',
  'cotizacion.aprobada': 'Aprobó',
  'cotizacion.final': 'Marcó como final',
  'cotizacion.moderada': 'Moderó',
  'cotizacion.comentario_moderado': 'Moderó un comentario de',
  'formula.publicada': 'Publicó',
  'formula_del_origen.crear': 'Creó',
  'formula_del_origen.renombrar': 'Renombró',
  'formula_del_origen.archivar': 'Archivó',
  'formula_del_origen.eliminar': 'Eliminó',
  'formula_del_origen.activar': 'Activó',
  'formula_del_origen.desactivar': 'Dejó de usar',
  'flujo.copiado': 'Copió las fases en',
  'fase.eliminada': 'Eliminó',
  'fase.jubilada': 'Jubiló',
  'fase.roles_cambiados': 'Cambió los roles de',
  'transicion.roles_cambiados': 'Cambió los roles de',
  'lead.creado': 'Creó',
  'lead.compartido': 'Compartió',
  'lead.transferido': 'Transfirió',
  'lead.adoptado_del_limbo': 'Adoptó',
  'lead.acceso_revocado': 'Revocó el acceso al portal de',
  'lead.seguimiento_creado': 'Registró un seguimiento de',
  'lead.seguimiento_editado': 'Editó un seguimiento de',
  'lead.seguimiento_eliminado': 'Eliminó un seguimiento de',
  'lead.seguimiento_restaurado': 'Restauró un seguimiento de',
  'lead.telefono_cambiado': 'Cambió el teléfono de',
  'lead.telefono_extra_agregado': 'Agregó un teléfono a',
  'lead.telefono_extra_quitado': 'Quitó un teléfono de',
  'lead.telefono_extra_rotulado': 'Rotuló un teléfono de',
  'oportunidad.transferida': 'Transfirió una oportunidad de',
  'pago.confirmado': 'Confirmó',
  'pago.anulado': 'Anuló',
  'origenes_lead.movido': 'Reordenó',
  'origenes_lead.por_defecto': 'Dejó por defecto',
  'tipos_lead.movido': 'Reordenó',
  'tipos_seguimiento.movido': 'Reordenó',
  'rol.permiso_otorgado': 'Otorgó',
  'rol.permiso_revocado': 'Revocó',
  'usuario.rol_asignado': 'Asignó',
  'usuario.rol_quitado': 'Quitó',
}

// La acción la escribe `auditar()` como `<tabla>.<insert|update|delete>`; las de `registrar_actividad()` traen su propia clave. Lo que se dice
// antes del registro: «Creó», «Cambió», «Borró», el de `VERBOS` o, de una acción sin verbo propio, «Hizo «…» en».
export function verboDeLaAccion(accion: string): string {
  const propio = VERBOS[accion]
  if (propio) return propio
  if (accion.endsWith('.insert')) return 'Creó'
  if (accion.endsWith('.update')) return 'Cambió'
  if (accion.endsWith('.delete')) return 'Borró'
  return `Hizo «${humanizar(accion)}» en`
}

// `atributos.<clave>` lleva la etiqueta del campo del layout (`leads_campos` / `origenes_campos`) si llega.
export function etiquetaDeCampo(
  tabla: string,
  clave: string,
  etiquetasDeAtributos?: ReadonlyMap<string, { etiqueta: string }>,
): string {
  const punto = clave.indexOf('.')
  if (punto > 0) {
    const interna = clave.slice(punto + 1)
    return etiquetasDeAtributos?.get(interna)?.etiqueta ?? humanizar(interna)
  }
  return CAMPOS_POR_TABLA[tabla]?.[clave] ?? CAMPOS_COMUNES[clave] ?? humanizar(clave)
}

// Sin persona: lo hizo el sistema (un job, un trigger); con persona y sin nombre cargado, «Sin nombre».
export function nombreDelActor(fila: Pick<FilaDeActividad, 'actorId' | 'actorNombre'>): string {
  if (fila.actorId === null) {
    return 'Sistema'
  }
  return fila.actorNombre ?? 'Sin nombre'
}
