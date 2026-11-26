import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { ResultadoDeTipo } from '../../../entities/documentos/repositorios'
import {
  MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS,
  MOTIVO_SOLO_LECTURA_DEL_FLUJO,
} from '../../../entities/documentos/vista-de-grupo'

export const MOTIVO_SIN_PERMISO_TIPOS_COMPARTIDOS = MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS
export const MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO = MOTIVO_SOLO_LECTURA_DEL_FLUJO

// Quién cambia un grupo: los compartidos (`flujoId` nulo), quien gestiona los catálogos de logística (la base pide la clave en cada origen que los usa);
// los de un flujo, quien lo configura (`flujos.configurar`, o `repuestos.configurar` para el de repuestos) o quien gestiona los catálogos de logística
// (el de un origen). Es la primera llave: el permiso por origen lo decide la base, y su rechazo (`42501`) llega con su texto, como el nombre repetido
// (`23505`): `comoResultado` pasa el mensaje de la base tal cual.
export function motivoSinPermisoDelGrupo(
  permisos: Permisos,
  flujoId: string | null,
): string | null {
  const gestionaLosCatalogos = puede(permisos, 'logistica.catalogos.gestionar')
  if (flujoId === null) {
    return gestionaLosCatalogos ? null : MOTIVO_SIN_PERMISO_TIPOS_COMPARTIDOS
  }
  return gestionaLosCatalogos ||
    puede(permisos, 'flujos.configurar') ||
    puede(permisos, 'repuestos.configurar')
    ? null
    : MOTIVO_SIN_PERMISO_TIPOS_DEL_FLUJO
}

export function sinPermisoDeTipos(motivo: string) {
  return fallo('sin_permiso', motivo)
}

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado<T>(resultado: ResultadoDeTipo<T>): ResultadoDeAccion<T> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}
