import { EyeOffIcon } from 'lucide-react'
import { MarcoEstado } from './marco-estado'
import { SalirDelLive } from './salir-del-live'

// La persona llegó por URL a algo que el Modo Live oculta: el servidor no lo leyó ni lo mandó. La salida apaga el Live y recarga la
// misma URL.
export function EstadoOcultoEnLive() {
  return (
    <MarcoEstado
      Icono={EyeOffIcon}
      titulo="Oculto en Modo Live"
      descripcion="Esto no se muestra mientras compartes la pantalla."
      accion={<SalirDelLive />}
    />
  )
}
