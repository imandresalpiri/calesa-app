'use client'

import type { ReactNode } from 'react'
import type { ParteDeLaFormula } from '@/shared/lib/rutas'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { TOPE_DE_FORMULAS_DEL_ORIGEN } from '../../../../entities/formula-del-origen'
import {
  ordenDeLaLista,
  type FormulaDeLaLista,
} from '../../../../entities/formulas-del-origen/lista'
import {
  CLAVE_DE_LA_COPIA,
  PANEL_NUEVA_FORMULA,
} from '../../../../entities/formulas-del-origen/rutas'
import { RanuraDeLaBarra, RanuraDelEstado } from '../../../barra-de-la-formula/components'
import { useArchivadas } from '../../hooks/use-archivadas'
import { usePanelesDeLaFormula } from '../../hooks/use-paneles-de-la-formula'
import { ModalDeNuevaFormulaDiferido } from '../diferidos'
import { EstadoEnLaBarra } from './estado-en-la-barra'
import { SelectorDeFormula } from './selector-de-formula'
import { useFormulaEnLaUrl } from './use-formula-en-la-url'

type Props = {
  // El origen abierto (la página ya comprobó la pestaña; este módulo no depende de `origenes`).
  origen: { id: string; nombre: string }
  parte: ParteDeLaFormula
  // La que se dibuja (la de `?formula=` o la de trabajo); nula si el origen no tiene ninguna.
  elegida: FormulaDeLaLista | null
  // Las sin archivar del origen, leídas en el servidor (≤ 51).
  lectura: { formulas: readonly FormulaDeLaLista[]; hayMas: boolean; hayArchivadas: boolean }
  // De cuáles puede copiar quien mira.
  origenesParaCopiar: readonly { id: string; nombre: string }[]
  // Lo que pone `src/app` de otras áreas: el botón «Versiones» y el de «Tablas».
  versiones?: ReactNode
  tablas?: ReactNode
}

// Las que pueden abrir un panel: las sin archivar, las archivadas leídas y la elegida (una archivada pedida por URL que aún no se leyó).
function conocidasDe(
  formulas: readonly FormulaDeLaLista[],
  archivadas: readonly FormulaDeLaLista[],
  elegida: FormulaDeLaLista | null,
): FormulaDeLaLista[] {
  const conocidas = [...formulas, ...archivadas]
  if (elegida && !conocidas.some((f) => f.id === elegida.id)) {
    conocidas.push(elegida)
  }
  return conocidas
}

function laActiva(formulas: readonly FormulaDeLaLista[]): { id: string; nombre: string } | null {
  const activa = formulas.find((f) => f.activa)
  return activa ? { id: activa.id, nombre: activa.nombre } : null
}

// La barra de la fórmula (docs/GLOSARIO.md › «Barra de la fórmula»), arriba de Planilla, Hoja y Tarjeta: el selector de fórmula, el estado (en la Planilla, con
// la ranura del botón ⓘ «Información de la fórmula» al lado, `RanuraDelEstado`) y, a la derecha,
// «Versiones», «Tablas» y lo que el editor de la pestaña lleva a la ranura (Guardar · Publicar · «⋯»). Monta una vez «Nueva fórmula» y los paneles de cada
// fórmula (`?panel=…-formula&cual=<id>`). En el celular se parte en renglones.
export function BarraDeLaFormulaDelOrigen({
  origen,
  parte,
  elegida,
  lectura,
  origenesParaCopiar,
  versiones,
  tablas,
}: Props) {
  useFormulaEnLaUrl(elegida?.id ?? null)
  const formulas = ordenDeLaLista(lectura.formulas)
  const archivadas = useArchivadas(origen.id, lectura)
  const nueva = usePanelPorUrl(PANEL_NUEVA_FORMULA, [CLAVE_DE_LA_COPIA])
  const aperturaDeNueva = useApertura(nueva.abierto)
  const enElTope = lectura.hayMas || formulas.length >= TOPE_DE_FORMULAS_DEL_ORIGEN
  // Sin fórmula elegida, el cuerpo de la página es «Empezar la fórmula», que monta su propio «Nueva fórmula».
  const conNueva = elegida !== null && !enElTope
  const nuevaMontada = useAbiertoAlgunaVez(nueva.abierto && conNueva)
  const { menuDe, paneles } = usePanelesDeLaFormula({
    origen,
    formulas: conocidasDe(formulas, archivadas.formulas, elegida),
    activa: laActiva(formulas),
    alCopiar: (formula) => {
      nueva.abrir({ [CLAVE_DE_LA_COPIA]: formula.id })
    },
    elegidaId: elegida?.id ?? null,
    parte,
  })
  return (
    <div
      data-barra-de-la-formula=""
      className="flex min-w-0 flex-wrap items-center gap-2 border-b border-(--color-line) pb-3"
    >
      <SelectorDeFormula
        origenId={origen.id}
        parte={parte}
        elegida={elegida}
        formulas={formulas}
        archivadas={archivadas}
        hayArchivadas={lectura.hayArchivadas}
        menuDe={menuDe}
        enElTope={enElTope}
        alNueva={() => {
          nueva.abrir()
        }}
      />
      {/* El estado y, en la Planilla, el botón ⓘ «Información de la fórmula» junto a él: en el celular se parten juntos. */}
      <div className="flex min-w-0 items-center gap-1">
        <EstadoEnLaBarra elegida={elegida} />
        {parte === 'planilla' && elegida !== null ? <RanuraDelEstado /> : null}
      </div>
      <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {versiones}
        {tablas}
        <RanuraDeLaBarra />
      </div>
      {nuevaMontada && conNueva ? (
        <ModalDeNuevaFormulaDiferido
          key={aperturaDeNueva}
          abierto={nueva.abierto}
          alCerrar={nueva.cerrar}
          origen={origen}
          origenesParaCopiar={origenesParaCopiar}
          copiaInicial={nueva.valor(CLAVE_DE_LA_COPIA)}
        />
      ) : null}
      {paneles}
    </div>
  )
}
