'use client'

import { useEffect, useRef, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { textoDeUsos, type UsosDelLogo, type VarianteDelLogo } from '../../../entities/logos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se quita (la última que se vio, mientras el diálogo se va).
  logo: VarianteDelLogo | null
  // Cuántas ventanas de cámara la usan (se pide al abrir); nulo mientras llega o si no se pudo saber.
  usos: (id: string) => Promise<UsosDelLogo | null>
  enCurso: boolean
  alQuitar: (logo: VarianteDelLogo) => Promise<boolean>
}

// Lo que dice el diálogo sobre dónde se usa la variante: se pide al abrirse, con un lugar reservado para que el texto no empuje nada.
function useUsosAlAbrir(abierto: boolean, id: string | null, pedir: Props['usos']) {
  const [usos, setUsos] = useState<{ id: string; valor: UsosDelLogo | null } | null>(null)
  // La función llega nueva en cada render: sólo importa al abrir o al cambiar de variante.
  const ultima = useRef(pedir)
  useEffect(() => {
    ultima.current = pedir
  })
  useEffect(() => {
    if (!abierto || id === null) {
      return
    }
    let vigente = true
    void ultima.current(id).then((valor) => {
      if (vigente) {
        setUsos({ id, valor })
      }
    })
    return () => {
      vigente = false
    }
  }, [abierto, id])
  return usos?.id === id ? usos : null
}

// «Quitar» una variante del logo (`?panel=quitar-logo&logo=<id>`): lo irreversible pide confirmar nombrando la variante. Si una ventana de cámara la
// usa, lo dice antes: esas ventanas vuelven al logo principal. El archivo se borra de Storage sólo si ninguna otra fila lo usa.
export function QuitarLogo({ abierto, alCerrar, logo, usos, enCurso, alQuitar }: Props) {
  const uso = useUsosAlAbrir(abierto, logo?.id ?? null, usos)
  const texto = uso?.valor ? textoDeUsos(uso.valor) : null
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (logo) {
          await alQuitar(logo)
        }
        alCerrar()
      }}
      titulo={logo ? `Quitar el logo «${logo.nombre}»` : 'Quitar el logo'}
      descripcion="Se borra de la empresa y no se puede deshacer. Para cambiar el logo principal, hazlo en Identidad."
      etiquetaConfirmar="Quitar logo"
      enCurso={enCurso}
      focoAlCerrar={() => false}
    >
      <div className="min-h-14" aria-live="polite">
        {texto ? (
          <Aviso tono="aviso">{texto} Esas ventanas pasan a usar el logo principal.</Aviso>
        ) : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {uso === null
              ? 'Comprobando dónde se usa…'
              : uso.valor === null
                ? 'No se pudo comprobar dónde se usa.'
                : 'Ninguna ventana de cámara la usa.'}
          </p>
        )}
      </div>
    </Confirmar>
  )
}
