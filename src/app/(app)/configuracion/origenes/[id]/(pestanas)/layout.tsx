import { Suspense } from 'react'
import { EsqueletoDelMarco } from '../esqueleto-del-marco'
import { MarcoDelOrigen } from '../marco-del-origen'

// La página de un origen, a todo el ancho: la cabecera con las migas y las pestañas (que lee la sesión y el origen tras su `<Suspense>`) y, debajo, la pestaña
// abierta, que llega con su propio `loading.tsx`. El layout no protege: cada pestaña comprueba sola su permiso. Con un panel al costado de la planilla abierto
// (`data-con-costado`, desde 1024 px no es modal) toda la página se corre su ancho (`normal` o `amplio`, el del `Drawer`), para que el panel no tape la barra
// de la fórmula ni la columna Ejemplo.
export default function LayoutDelOrigen({
  children,
  params,
}: LayoutProps<'/configuracion/origenes/[id]'>) {
  return (
    <div className="grid min-w-0 gap-4 min-[1024px]:has-[[data-con-costado=amplio]]:pr-[36rem] min-[1024px]:has-[[data-con-costado=normal]]:pr-[28rem]">
      <Suspense fallback={<EsqueletoDelMarco />}>
        {params.then(({ id }) => (
          <MarcoDelOrigen id={id} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}
