// Los datos que ofrece «Agregar › Texto» del editor de artes, por grupo y en el orden del catálogo del origen: Vehículo, «Ficha de <origen>»
// (los campos activos de su ficha que no repiten una fija), Cotización (con las celdas de la tarjeta de la cotización elegida, por su
// concepto), Cliente, Quien comparte y Empresa. Un grupo sin datos no va. Puro.
import {
  GRUPOS_DE_VARIABLES,
  PREFIJO_DE_CELDA,
  PREFIJO_DE_FICHA,
  TITULOS_DE_LOS_GRUPOS,
  type CatalogoDelArte,
} from './variables-del-arte'

export type DatoParaAgregar = { clave: string; etiqueta: string }
export type GrupoParaAgregar = { clave: string; titulo: string; datos: DatoParaAgregar[] }

export function gruposParaAgregar(
  catalogo: CatalogoDelArte,
  { origen, celdas }: { origen: string; celdas: readonly string[] },
): GrupoParaAgregar[] {
  const grupos: GrupoParaAgregar[] = []
  const sumar = (clave: string, titulo: string, datos: DatoParaAgregar[]) => {
    if (datos.length > 0) {
      grupos.push({ clave, titulo, datos })
    }
  }
  for (const grupo of GRUPOS_DE_VARIABLES) {
    const delGrupo = catalogo.variables.filter((v) => v.grupo === grupo)
    const dato = ({ clave, etiqueta }: DatoParaAgregar) => ({ clave, etiqueta })
    sumar(
      grupo,
      TITULOS_DE_LOS_GRUPOS[grupo],
      delGrupo.filter((v) => !v.clave.startsWith(PREFIJO_DE_FICHA)).map(dato),
    )
    if (grupo === 'vehiculo') {
      sumar(
        'ficha',
        `Ficha de ${origen}`,
        delGrupo.filter((v) => v.clave.startsWith(PREFIJO_DE_FICHA)).map(dato),
      )
    }
    if (grupo === 'cotizacion') {
      const ultimo = grupos.at(-1)
      const deLasCeldas = celdas.map((concepto) => ({
        clave: `${PREFIJO_DE_CELDA}${concepto}`,
        etiqueta: concepto,
      }))
      if (ultimo?.clave === 'cotizacion') {
        ultimo.datos.push(...deLasCeldas)
      } else {
        sumar('cotizacion', TITULOS_DE_LOS_GRUPOS.cotizacion, deLasCeldas)
      }
    }
  }
  return grupos
}
