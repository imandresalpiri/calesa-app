'use client'

import { ListTreeIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CuerpoDelCatalogo } from './diferidos'
import type { PropsDelCatalogo } from './tipos'

// El botón de un catálogo que se elige (los grupos de campos, las categorías de FAQ) y su panel (`?panel=<panel>`). El cuerpo (el
// nombre, la lista con su «⋯» y el diálogo de quitar) se pide al abrirlo por primera vez: no viaja en la pantalla que lo tiene.
export function DrawerDeCatalogo(props: PropsDelCatalogo) {
  const panel = usePanelPorUrl(props.panel)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-[44px] md:h-9"
        onClick={() => {
          panel.abrir()
        }}
      >
        <ListTreeIcon aria-hidden className="size-4" />
        {props.textos.boton}
      </Button>
      <Drawer
        abierto={panel.abierto}
        alCerrar={panel.cerrar}
        titulo={props.textos.titulo}
        descripcion={props.textos.descripcion}
        pie={
          <Button type="button" className="min-h-11 md:min-h-9" onClick={panel.cerrar}>
            Listo
          </Button>
        }
      >
        {montar ? <CuerpoDelCatalogo {...props} /> : null}
      </Drawer>
    </>
  )
}
