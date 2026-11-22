import { Suspense, type ReactNode } from 'react'
import { requerirSesion } from '@/modules/equipo'
import { PestanasDeLaConfiguracion } from './pestanas-de-la-configuracion'
import { pestanasParaLaPersona } from './pestanas'

// La reserva de la tira mientras llega la sesión: la página no salta al llegar.
const RESERVA_DE_LA_TIRA = 'min-h-11 md:min-h-8'

async function TiraDePestanas() {
  const { permisos } = await requerirSesion()
  return <PestanasDeLaConfiguracion pestanas={pestanasParaLaPersona(permisos)} />
}

// Logística › Configuración: el título y la tira de pestañas (una por catálogo, cada una su sub-ruta). Un layout no protege a su página: cada pestaña comprueba sola su permiso.
// Va dentro del layout de Logística (su menú y su marco); sin tope de ancho.
export default function LayoutDeLaConfiguracionDeLogistica({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
        Configuración de logística
      </h1>
      <Suspense fallback={<div className={RESERVA_DE_LA_TIRA} />}>
        <TiraDePestanas />
      </Suspense>
      {children}
    </div>
  )
}
