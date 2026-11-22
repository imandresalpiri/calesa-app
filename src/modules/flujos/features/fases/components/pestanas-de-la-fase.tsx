'use client'

import { useState, type ReactNode } from 'react'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import { TabsContent } from '@/shared/ui/tabs'
import {
  PESTANAS_DE_FASE,
  TITULO_DE_PESTANA_DE_FASE,
  pestanaPedida,
} from '../../../entities/fases/bloques-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { usePestanaDeFase } from '../hooks/use-pestana-de-fase'
import { AvisoDeFaseJubilada } from './aviso-de-fase-jubilada'
import { FormularioDeDatosDeLaFase } from './formulario-de-datos-de-la-fase'
import { SIN_MARCAS, marcaDeLaPestana, type MarcasDeLasPestanas } from './marcas-de-las-pestanas'

type Props = {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  // «Requisitos para entrar», «Salidas y quién mueve» y «Reglas que la afectan»: los pone el panel (cada uno llena su hueco). Van en la pestaña «Reglas»,
  // fuera del formulario y de su `key`, así que escribir en un bloque no los reinicia.
  reglas: ReactNode
}

// El hueco `bloques.pestanas`: el cuerpo del panel de una fase en tres pestañas. **Reglas** abre primero (lo que más se edita: requisitos, salidas y reglas
// que la afectan; cada bloque guarda por su cuenta); **Identidad** y **Ajustes** son un solo formulario con un solo «Guardar» al pie. Las tres quedan montadas
// y las que no se ven, ocultas: cambiar de pestaña no pierde lo escrito. La pestaña vive en la URL (`usePestanaDeFase`). Las que tienen un error o algo sin
// guardar se marcan aunque no se vean.
export function PestanasDeLaFase({ flujo, fase, reglas }: Props) {
  const { pestana, elegir } = usePestanaDeFase()
  const [marcas, setMarcas] = useState<MarcasDeLasPestanas>(SIN_MARCAS)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <AvisoDeFaseJubilada flujo={flujo} fase={fase} />
      <PestanasConDesborde
        pestanas={PESTANAS_DE_FASE.map((clave) => ({
          clave,
          titulo: TITULO_DE_PESTANA_DE_FASE[clave],
          marca: marcaDeLaPestana(marcas, clave),
        }))}
        valor={pestana}
        alElegir={(clave) => {
          elegir(pestanaPedida(clave))
        }}
      >
        <TabsContent value="reglas" keepMounted className="pt-2">
          {reglas}
        </TabsContent>
        <FormularioDeDatosDeLaFase
          key={`${fase.id}-${flujo.version}`}
          flujo={flujo}
          fase={fase}
          pestana={pestana}
          alElegirPestana={elegir}
          alMarcar={setMarcas}
        />
      </PestanasConDesborde>
    </div>
  )
}
