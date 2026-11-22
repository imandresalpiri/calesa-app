'use client'

import { useState } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { useApertura } from '@/shared/ui/use-apertura'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { formatoDeCelda, monedaDeFormato, type ContextoDeHoja } from '../../../../entities/binding'
import type { CeldaDeHoja, SeccionDeHoja } from '../../../../entities/hoja'
import type { DeDondeCalcula } from '../../../../entities/pedido-de-recalculo'
import {
  bloquesDeLaAyuda,
  celdaConAyuda,
  tituloDeLaAyuda,
} from '../../../../entities/presentacion-de-la-hoja'
import type { AyudaDeLaHoja } from '../../hooks/use-ayuda-de-la-hoja'
import { botonDeAyuda } from '../boton-de-ayuda'
import { BloqueDeEnlaces } from './bloque-de-enlaces'
import { BloqueDeTabla } from './bloque-de-tabla'
import { BloqueDeTexto, BloqueDeTitulo } from './bloque-de-texto'

type Props = {
  // Las secciones donde se busca la celda que nombra la URL: la ayuda de una celda del modal se abre dentro del modal, la de la hoja en la hoja.
  secciones: readonly SeccionDeHoja[]
  contexto: ContextoDeHoja
  ayuda: AyudaDeLaHoja
}

// Desde este ancho el panel va al costado; por debajo, desde abajo (85 dvh).
const AL_COSTADO = '(min-width: 768px)'

// Los bloques en su orden (sin el primer título, que es el del panel). Cada tabla lee la suya a la vez que las demás; si la celda es dinero, sus cifras pasan por `<Monto>`.
function BloquesDeLaAyuda({ celda, lectura }: { celda: CeldaDeHoja; lectura: DeDondeCalcula }) {
  const dinero =
    formatoDeCelda(celda.formato) === 'monto' ? { moneda: monedaDeFormato(celda.formato) } : null
  return (
    <div className="grid min-w-0 gap-5">
      {bloquesDeLaAyuda(celda).map((bloque, i) => {
        // Los bloques no tienen id ni cambian con el panel abierto: la posición los distingue.
        const clave = `${String(i)}:${bloque.tipo}`
        switch (bloque.tipo) {
          case 'titulo':
            return <BloqueDeTitulo key={clave} texto={bloque.texto} />
          case 'texto':
            return <BloqueDeTexto key={clave} texto={bloque.texto} />
          case 'enlaces':
            return <BloqueDeEnlaces key={clave} enlaces={bloque.enlaces} />
          case 'tabla':
            return <BloqueDeTabla key={clave} bloque={bloque} lectura={lectura} dinero={dinero} />
        }
      })}
    </div>
  )
}

// La ayuda de una celda (docs/GLOSARIO.md › «Ayuda (de una celda)»): un panel de sólo lectura con sus bloques, con su URL. Si la URL nombra una celda que estas secciones no
// dibujan o que no tiene ayuda, no abre nada. Al cerrar, el foco vuelve al botón de ayuda de su celda, también si se abrió por la URL. Cada apertura vuelve a montar el cuerpo
// (`key`): una tabla que la memoria ya olvidó se lee otra vez.
export function AyudaEnBloques({ secciones, contexto, ayuda }: Props) {
  const celda = celdaConAyuda(secciones, ayuda.nodo, contexto)
  // La celda se recuerda mientras el panel se va: sin ella se vaciaría a media animación.
  const [ultima, setUltima] = useState<CeldaDeHoja | null>(null)
  if (celda !== null && celda !== ultima) {
    setUltima(celda)
  }
  const apertura = useApertura(celda !== null)
  const alCostado = useConsultaDeMedios(AL_COSTADO)
  const mostrada = celda ?? ultima
  if (mostrada === null) {
    return null
  }
  return (
    <Drawer
      abierto={celda !== null}
      alCerrar={ayuda.cerrar}
      titulo={tituloDeLaAyuda(mostrada)}
      lado={alCostado ? 'right' : 'bottom'}
      ancho="amplio"
      focoAlCerrar={() => botonDeAyuda(mostrada)}
    >
      <BloquesDeLaAyuda
        key={`${String(apertura)}:${mostrada.nodo}`}
        celda={mostrada}
        lectura={ayuda.lectura}
      />
    </Drawer>
  )
}
