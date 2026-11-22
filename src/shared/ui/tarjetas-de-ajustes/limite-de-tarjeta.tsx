'use client'

import { useRouter } from 'next/navigation'
import { Component, type ReactNode } from 'react'
import { Button } from '../button'
import { TarjetaDeAjustes } from './tarjeta-de-ajustes'

type Props = {
  titulo: string
  alReintentar: () => void
  children: ReactNode
}

type Estado = { fallo: boolean; intento: number }

// Una tarjeta cuya lectura falla (en el servidor, el error llega hasta acá) no tumba la página: queda su caja con el título, «No pudimos cargar «<título>».»
// y «Reintentar», que la monta de nuevo y vuelve a pedir la pantalla. Las demás tarjetas y la lista de la página siguen.
class Limite extends Component<Props, Estado> {
  override state: Estado = { fallo: false, intento: 0 }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override componentDidCatch(error: Error) {
    console.warn(`No se pudo dibujar la tarjeta «${this.props.titulo}»`, error.message)
  }

  override render() {
    if (!this.state.fallo) {
      return <Reintentable key={this.state.intento}>{this.props.children}</Reintentable>
    }
    return (
      <TarjetaDeAjustes titulo={this.props.titulo}>
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No pudimos cargar «{this.props.titulo}».
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              this.setState((previo) => ({ fallo: false, intento: previo.intento + 1 }))
              this.props.alReintentar()
            }}
          >
            Reintentar
          </Button>
        </div>
      </TarjetaDeAjustes>
    )
  }
}

// Sin nada propio: su `key` cambia con cada intento para que la tarjeta se monte de nuevo.
function Reintentable({ children }: { children: ReactNode }) {
  return children
}

export function LimiteDeTarjeta(props: Omit<Props, 'alReintentar'>) {
  const router = useRouter()
  return <Limite {...props} alReintentar={router.refresh} />
}
