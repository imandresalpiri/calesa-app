import { Suspense } from 'react'
import { EsqueletoDelMarco } from '../esqueleto-del-marco'
import { MarcoDelOrigen } from '../marco-del-origen'

// La página de un origen: el encabezado con «Para cotizar y mover» y las pestañas (que lee la sesión y el origen tras su `<Suspense>`) y,
// debajo, la pestaña abierta, que llega con su propio `loading.tsx`. El layout no protege: cada pestaña comprueba sola su permiso.
export default function LayoutDelOrigen({
  children,
  params,
}: LayoutProps<'/configuracion/origenes/[id]'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense fallback={<EsqueletoDelMarco />}>
        {params.then(({ id }) => (
          <MarcoDelOrigen id={id} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}
