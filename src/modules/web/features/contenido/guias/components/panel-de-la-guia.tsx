'use client'

import type { Editor } from '@tiptap/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { OpcionesDelBloque } from '../../editor/components/opciones/opciones-del-bloque'
import type { PestanaDelPanel } from '../hooks/use-pestana-del-panel'
import { PestanaPublicacion, type PropsDePublicacion } from './pestana-publicacion'

type Props = {
  pestana: PestanaDelPanel
  alCambiarPestana: (pestana: PestanaDelPanel) => void
  editor: Editor | null
  deshabilitado: boolean
  publicacion: PropsDePublicacion
}

// El contenido del panel de la guía: «Publicación» (estado, datos, buscadores) y «Bloque» (las opciones del bloque elegido en el texto). Lo mismo
// va al lado del texto en una pantalla ancha y en un cajón en una angosta.
export function PanelDeLaGuia({
  pestana,
  alCambiarPestana,
  editor,
  deshabilitado,
  publicacion,
}: Props) {
  return (
    <Tabs
      value={pestana}
      onValueChange={(valor) => {
        if (valor === 'publicacion' || valor === 'bloque') {
          alCambiarPestana(valor)
        }
      }}
      className="gap-4"
    >
      <TabsList className="w-full">
        <TabsTrigger value="publicacion" className="min-h-11 md:min-h-8">
          Publicación
        </TabsTrigger>
        <TabsTrigger value="bloque" className="min-h-11 md:min-h-8">
          Bloque
        </TabsTrigger>
      </TabsList>
      <TabsContent value="publicacion">
        <PestanaPublicacion {...publicacion} />
      </TabsContent>
      <TabsContent value="bloque">
        <OpcionesDelBloque editor={editor} deshabilitado={deshabilitado} />
      </TabsContent>
    </Tabs>
  )
}
