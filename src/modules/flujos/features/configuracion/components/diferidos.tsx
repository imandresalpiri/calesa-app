'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelDiagrama } from './esqueleto-del-diagrama'
import { ListaDeFases } from './lista-de-fases'
import { MarcoDelLienzo } from './marco-del-lienzo'

// El panel se pide recién al abrirse la primera vez (`useAbiertoAlgunaVez()`): las fases no cargan su código para mostrarse.
export const PanelDelFlujoDiferido = diferido(() =>
  import('./panel-del-flujo').then((modulo) => modulo.PanelDelFlujo),
)

// El diagrama (y `@xyflow/react`) llega al dibujarse: ninguna otra pantalla lo paga. Si su código no llega, el aviso «Sin conexión» con la lista debajo.
export const DiagramaDelFlujoDiferido = diferido(
  () => import('./diagrama/diagrama-del-flujo').then((modulo) => modulo.DiagramaDelFlujo),
  {
    aviso: 'aqui',
    esqueleto: (
      <MarcoDelLienzo>
        <EsqueletoDelDiagrama />
      </MarcoDelLienzo>
    ),
    respaldo: ({ flujo, huecos, alAbrir }) => (
      <ListaDeFases flujo={flujo} huecos={huecos} alAbrir={alAbrir} />
    ),
  },
)
