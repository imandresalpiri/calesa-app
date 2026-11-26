// El layout de campos de un origen: qué datos tiene un vehículo de ese origen y cómo se ven. Los
// datos comunes (marca, modelo, año, VIN, lote, precio) son columnas de `vehiculos`; lo demás vive
// en `vehiculos.atributos` y se describe acá.
import { z } from 'zod'
import {
  TIPOS_DE_VEHICULO,
  claveDeCampo as claveDeCampoGenerica,
  type CampoBase,
  type CamposDelGrupo as CamposDelGrupoGenerico,
  type TipoDeVehiculo,
} from '@/shared/lib/campos'
import { ESTILO_DE_CLAVE } from './nombre'

// El motor (tipos, orden, grupos) es de `shared`: los leads usan el mismo. Acá se reexporta para que
// `index.ts`, `client.ts` y los otros módulos sigan importándolo de `origenes`.
export {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  agruparCampos,
  destinoDeMovimiento,
  tieneOpciones,
  type OpcionDeCampo,
  type Sentido,
  type ValorDefecto,
} from '@/shared/lib/campos'

// El layout de un origen sólo ofrece los tipos de un vehículo: el correo y el documento son de los
// leads (la base lo cuida con un `check`).
export const TIPOS_DE_CAMPO = TIPOS_DE_VEHICULO
export type TipoDeCampo = TipoDeVehiculo

// Son columnas de `vehiculos`: un campo propio con esa clave se prestaría a confusión. Espejo de
// `_origen_clave_reservada()`; la base lo vuelve a comprobar.
export const CLAVES_RESERVADAS: readonly string[] = [
  'marca',
  'modelo',
  'anio',
  'vin',
  'lote',
  'precio',
  'precio_negociable',
  'acepta_permuta',
  'placado',
  'kilometraje',
  'titulo',
  'plataforma',
  'url_origen',
  'categoria_id',
  'atributos',
]

export type CampoDeLayout = CampoBase<TipoDeCampo> & {
  origenId: string
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | null
  // El campo que identifica al vehículo en la lista, el resumen y logística: uno por origen como mucho, activo y nunca un monto (6.13).
  principal: boolean
}

// Lo que hace falta del campo principal para mostrar la identidad de un vehículo (`leerCampoPrincipal()`).
export type CampoPrincipal = Pick<CampoDeLayout, 'clave' | 'etiqueta' | 'tipo' | 'opciones'>

const esquemaOpciones = z.array(z.object({ clave: z.string(), etiqueta: z.string() })).catch([])

const esquemaValorDefectoDeFila = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .nullable()
  .catch(null)

const esquemaCampos = z.array(
  z.object({
    id: z.guid(),
    origen_id: z.guid(),
    clave: z.string(),
    etiqueta: z.string(),
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones: esquemaOpciones,
    requerido: z.boolean(),
    valor_defecto: esquemaValorDefectoDeFila,
    minimo: z.number().nullable().catch(null),
    maximo: z.number().nullable().catch(null),
    // El grupo de campos, por embed (`COLUMNAS_DE_CAMPO`).
    grupo: z.object({ id: z.guid(), nombre: z.string(), orden: z.number() }).nullable(),
    orden: z.number(),
    en_tarjeta: z.boolean(),
    filtrable: z.boolean(),
    publico_web: z.boolean(),
    clave_apibara: z.string().nullable(),
    principal: z.boolean(),
    es_sistema: z.boolean(),
    activo: z.boolean(),
    actualizado_en: z.string(),
  }),
)

// Lo que se lee de `origenes_campos`: sus columnas y el nombre y el orden de su grupo de campos (por la FK compuesta
// `origenes_campos_grupo_fkey`, en la misma lectura).
export const COLUMNAS_DE_CAMPO =
  'id, origen_id, clave, etiqueta, tipo, opciones, requerido, valor_defecto, minimo, maximo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, principal, es_sistema, activo, actualizado_en, grupo:origenes_campos_grupos!origenes_campos_grupo_fkey(id, nombre, orden)'

// En el orden del layout: `orden`, y a igualdad la clave (como la base).
export function camposDesde(filas: unknown): CampoDeLayout[] {
  return esquemaCampos
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      origenId: fila.origen_id,
      clave: fila.clave,
      etiqueta: fila.etiqueta,
      tipo: fila.tipo,
      opciones: fila.opciones,
      requerido: fila.requerido,
      valorDefecto: fila.valor_defecto,
      minimo: fila.minimo,
      maximo: fila.maximo,
      grupoId: fila.grupo?.id ?? null,
      grupo: fila.grupo?.nombre ?? null,
      ordenDelGrupo: fila.grupo?.orden ?? null,
      orden: fila.orden,
      enTarjeta: fila.en_tarjeta,
      filtrable: fila.filtrable,
      publicoWeb: fila.publico_web,
      claveApibara: fila.clave_apibara,
      principal: fila.principal,
      esSistema: fila.es_sistema,
      activo: fila.activo,
      actualizadoEn: fila.actualizado_en,
    }))
    .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave))
}

export type CamposDelGrupo = CamposDelGrupoGenerico<CampoDeLayout>

const esquemaCampoPrincipal = z
  .object({
    clave: z.string(),
    etiqueta: z.string(),
    tipo: z.enum(TIPOS_DE_CAMPO),
    opciones: esquemaOpciones,
  })
  .nullable()

// La fila del campo principal (o ninguna) como `CampoPrincipal`.
export function campoPrincipalDesde(fila: unknown): CampoPrincipal | null {
  return esquemaCampoPrincipal.parse(fila ?? null)
}

// La clave de un campo nuevo sale de su etiqueta; si choca con una columna de `vehiculos` o con
// otro campo del origen se le agrega un sufijo.
export function claveDeCampo(etiqueta: string, existentes: readonly string[]): string {
  return claveDeCampoGenerica(etiqueta, existentes, CLAVES_RESERVADAS, ESTILO_DE_CLAVE)
}
