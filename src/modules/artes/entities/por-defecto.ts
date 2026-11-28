// La plantilla por defecto (docs/GLOSARIO.md › «Plantilla por defecto»): la que cada persona elige para imagen y para PDF en cada origen. Sin
// elegir, o si la elegida ya no se ve (otro origen, pasó a privada, se borró), se comparte lo de hoy: la imagen de la tarjeta de la cotización
// o el PDF de la cotización. Puro.
import { tipoDelFormato, type ClaveDeFormato, type TipoDeArte } from './formatos'
import type { PorDefecto } from './tipos'

export type QueSeComparte =
  { tipo: 'plantilla'; plantillaId: string } | { tipo: 'de-hoy'; cual: TipoDeArte }

type PlantillaVisible = { id: string; formato: ClaveDeFormato; origenId: string }

// Qué se comparte de una cotización de `origenId` como `tipo`. `plantillaVisible` es la que la base devolvió por RLS para esa fila (nula si ya
// no se ve): se comprueba que sea la elegida, de ese origen y de ese tipo.
export function queSeComparte({
  porDefecto,
  plantillaVisible,
  origenId,
  tipo,
}: {
  porDefecto: PorDefecto | null
  plantillaVisible: PlantillaVisible | null
  origenId: string
  tipo: TipoDeArte
}): QueSeComparte {
  const deHoy: QueSeComparte = { tipo: 'de-hoy', cual: tipo }
  if (porDefecto === null || plantillaVisible === null) {
    return deHoy
  }
  const coincide =
    porDefecto.origenId === origenId &&
    porDefecto.tipo === tipo &&
    plantillaVisible.id === porDefecto.plantillaId &&
    plantillaVisible.origenId === origenId &&
    tipoDelFormato(plantillaVisible.formato) === tipo
  return coincide ? { tipo: 'plantilla', plantillaId: plantillaVisible.id } : deHoy
}

// La fila de por defecto de quien mira que apunta a esta plantilla (en su origen y para su tipo), o nula.
export function esLaPorDefecto(
  porDefecto: readonly PorDefecto[],
  plantilla: PlantillaVisible,
): PorDefecto | null {
  const tipo = tipoDelFormato(plantilla.formato)
  return (
    porDefecto.find(
      (p) => p.plantillaId === plantilla.id && p.origenId === plantilla.origenId && p.tipo === tipo,
    ) ?? null
  )
}

// La fila que hoy ocupa el lugar (origen y tipo) de esta plantilla: su versión es la que manda al cambiarla.
export function porDefectoDelLugar(
  porDefecto: readonly PorDefecto[],
  origenId: string,
  tipo: TipoDeArte,
): PorDefecto | null {
  return porDefecto.find((p) => p.origenId === origenId && p.tipo === tipo) ?? null
}
