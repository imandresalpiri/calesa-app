'use client'

import { rutaDeLaFormula, type ParteDeLaFormula } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FormulaDeLaLista } from '../../../../entities/formulas-del-origen/lista'
import { MENSAJE_DEL_TOPE } from '../../../../entities/formulas-del-origen/resultado'
import type { useArchivadas } from '../../hooks/use-archivadas'
import { Archivadas } from '../archivadas'
import { BotonDeNuevaFormula } from '../boton-de-nueva-formula'
import { FilaDeFormula } from './fila-de-formula'

export const VACIO_DE_FORMULAS =
  'Este origen todavía no tiene fórmulas: crea la primera en blanco o copia una.'

type Props = {
  origenId: string
  parte: ParteDeLaFormula
  elegidaId: string | null
  // Las sin archivar, en el orden de la lista (la activa primero).
  formulas: readonly FormulaDeLaLista[]
  archivadas: ReturnType<typeof useArchivadas>
  hayArchivadas: boolean
  menuDe: (formula: FormulaDeLaLista) => AccionDeMenu[]
  enElTope: boolean
  // Nulo en sólo lectura (Modo Live): sin «Nueva fórmula».
  alNueva: (() => void) | null
  // Cierra el selector.
  alCerrar: () => void
}

// Lo que cierra el selector antes de abrir un panel desde el «⋯» de una fila.
const cerrandoAntes = (acciones: AccionDeMenu[], alCerrar: () => void): AccionDeMenu[] =>
  acciones.map((accion) =>
    accion.tipo === 'accion'
      ? {
          ...accion,
          alElegir: () => {
            alCerrar()
            accion.alElegir()
          },
        }
      : accion,
  )

// La lista del selector de fórmula: las sin archivar (la activa primero, ★), cada una un enlace a la misma pestaña con ella y su «⋯»; «Nueva fórmula» (apagada
// en el tope) y, plegadas, las archivadas.
export function ListaDelSelector({
  origenId,
  parte,
  elegidaId,
  formulas,
  archivadas,
  hayArchivadas,
  menuDe,
  enElTope,
  alNueva,
  alCerrar,
}: Props) {
  const fila = (formula: FormulaDeLaLista) => (
    <FilaDeFormula
      key={formula.id}
      href={rutaDeLaFormula(origenId, formula.id, parte)}
      formula={formula}
      elegida={formula.id === elegidaId}
      acciones={cerrandoAntes(menuDe(formula), alCerrar)}
      alIr={alCerrar}
    />
  )
  return (
    <div className="grid max-h-[min(32rem,70vh)] min-w-0 gap-2 overflow-y-auto">
      {formulas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink)">{VACIO_DE_FORMULAS}</p>
      ) : (
        <ul aria-label="Fórmulas del origen" className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
          {formulas.map(fila)}
        </ul>
      )}
      {enElTope ? <AvisoDeTope texto={MENSAJE_DEL_TOPE} /> : null}
      {alNueva === null ? null : (
        <div>
          <BotonDeNuevaFormula
            enElTope={enElTope}
            alAbrir={() => {
              alCerrar()
              alNueva()
            }}
          />
        </div>
      )}
      {hayArchivadas ? <Archivadas archivadas={archivadas} fila={fila} /> : null}
    </div>
  )
}
