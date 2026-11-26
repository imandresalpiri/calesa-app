'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useCopiarFases } from '../hooks/use-copiar-fases'
import { ResultadoDeLaCopia } from './resultado-de-la-copia'

type Props = {
  abierto: boolean
  alCerrar: () => void
  flujo: Pick<FlujoParaConfigurar, 'id' | 'origenId'>
}

const ID_DEL_FORMULARIO = 'copiar-fases'
const ID_DEL_ORIGEN = 'origen-de-donde-copiar'
export const TITULO_DE_COPIAR_FASES = 'Empezar con las fases de…'

// «Empezar con las fases de…» (`?panel=copiar-fases`): elegir el origen de donde copiar y copiar. Con algo que no se copió tal cual, el mismo modal
// lo dice antes de cerrarse. Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function ModalDeCopiarFases({ abierto, alCerrar, flujo }: Props) {
  const c = useCopiarFases({ flujo, alCerrar, abierto })

  if (c.resultado) {
    return (
      <ResultadoDeLaCopia
        abierto={abierto}
        alCerrar={alCerrar}
        titulo={TITULO_DE_COPIAR_FASES}
        resultado={c.resultado}
      />
    )
  }

  return (
    <ModalDeFormulario
      id={ID_DEL_FORMULARIO}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={TITULO_DE_COPIAR_FASES}
      descripcion="El flujo empieza como copia del de otro origen. Después lo ajustas como quieras."
      focoInicial={() => document.getElementById(ID_DEL_ORIGEN)}
      formulario={c.formulario}
      guardar={{ etiqueta: 'Copiar las fases', enCurso: 'Copiando…' }}
    >
      <CampoSeleccion
        nombre={ID_DEL_ORIGEN}
        etiqueta="Origen"
        value={c.elegido}
        onChange={(evento) => {
          c.elegir(evento.target.value)
        }}
        opciones={[
          { valor: '', etiqueta: 'Elige un origen', deshabilitada: true },
          ...c.desde.map((d) => ({ valor: d.flujoId, etiqueta: d.titulo })),
        ]}
        error={c.error}
      />
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Se copian las fases activas con sus salidas, quién mueve, los requisitos y las reglas del
        flujo. Los tipos de documento compartidos se usan tal cual; los propios de ese origen se
        crean en este, o se usa el que ya tenga el mismo nombre.
      </p>
    </ModalDeFormulario>
  )
}
