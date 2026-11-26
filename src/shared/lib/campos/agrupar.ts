// Los campos activos agrupados como los muestra un formulario o una ficha.
type Agrupable = { grupo: string | null; ordenDelGrupo: number | null; activo: boolean }

// Un bloque con sus campos (el dibujo); la fila del catálogo es `GrupoDeCampos` (`grupos.ts`).
export type CamposDelGrupo<Campo extends Agrupable> = {
  // null = los que no tienen grupo.
  nombre: string | null
  campos: Campo[]
}

// Los grupos en el orden del catálogo (y por nombre si empatan), y «sin grupo» al final. Los desactivados no se muestran. El nombre
// es único por layout: alcanza para juntar.
export function agruparCampos<Campo extends Agrupable>(
  campos: readonly Campo[],
): CamposDelGrupo<Campo>[] {
  const grupos = new Map<string | null, { orden: number; campos: Campo[] }>()
  for (const campo of campos) {
    if (!campo.activo) {
      continue
    }
    const grupo = grupos.get(campo.grupo)
    if (grupo) {
      grupo.campos.push(campo)
    } else {
      grupos.set(campo.grupo, { orden: campo.ordenDelGrupo ?? 0, campos: [campo] })
    }
  }
  const conNombre = [...grupos]
    .flatMap(([nombre, grupo]) => (nombre === null ? [] : [{ nombre, ...grupo }]))
    .sort((a, b) => a.orden - b.orden || (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0))
  const sinGrupo = grupos.get(null)
  return [
    ...conNombre.map(({ nombre, campos: delGrupo }) => ({ nombre, campos: delGrupo })),
    ...(sinGrupo ? [{ nombre: null, campos: sinGrupo.campos }] : []),
  ]
}
