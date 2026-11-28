'use client'

import { GroupIcon, UngroupIcon } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { MOTIVO_DE_SOLO_LECTURA } from '../../../../entities/editor/agregar-en-el-panel'
import {
  motivoParaAgrupar,
  motivoParaDesagrupar,
} from '../../../../entities/editor/capas-en-la-lista'
import type { LogoDelEditor } from '../../../../entities/tipos'
import type { EditorDeArte } from '../../tipos'
import { ListaDeCapas } from './lista-de-capas'

type Props = { editor: EditorDeArte; logos: readonly LogoDelEditor[] }

// La pestaña «Capas» del panel izquierdo: su título con «Agrupar» y «Desagrupar» (apagados, con el motivo en el título, cuando lo elegido no
// alcanza o en sólo lectura) y la lista de lo que hay en la página.
export function PestanaCapas({ editor, logos }: Props) {
  const { pagina, estado, despachar, soloLectura } = editor
  const id = useId()
  const botones = [
    {
      clave: 'agrupar',
      etiqueta: 'Agrupar',
      Icono: GroupIcon,
      motivo: soloLectura ? MOTIVO_DE_SOLO_LECTURA : motivoParaAgrupar(pagina, estado.seleccion),
      alHacer: () => {
        despachar({ tipo: 'agrupar', nuevoId: crypto.randomUUID() })
      },
    },
    {
      clave: 'desagrupar',
      etiqueta: 'Desagrupar',
      Icono: UngroupIcon,
      motivo: soloLectura ? MOTIVO_DE_SOLO_LECTURA : motivoParaDesagrupar(pagina, estado.seleccion),
      alHacer: () => {
        despachar({ tipo: 'desagrupar' })
      },
    },
  ]
  return (
    <section aria-labelledby={id} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-2 py-2">
      <div className="flex min-h-8 items-center justify-between gap-2 pl-1">
        <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          Capas
        </h3>
        <div className="flex items-center gap-0.5">
          {botones.map(({ clave, etiqueta, Icono, motivo, alHacer }) => (
            <Button
              key={clave}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={etiqueta}
              aria-disabled={motivo !== null}
              title={motivo === null ? etiqueta : `${etiqueta}: ${motivo}`}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent"
              onClick={() => {
                if (motivo === null) {
                  alHacer()
                }
              }}
            >
              <Icono aria-hidden />
            </Button>
          ))}
        </div>
      </div>
      <ListaDeCapas editor={editor} logos={logos} />
    </section>
  )
}
