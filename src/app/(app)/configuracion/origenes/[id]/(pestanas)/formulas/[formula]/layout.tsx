import { Suspense } from 'react'
import { Skeleton } from '@/shared/ui/skeleton'
import { CabezaDelEditor } from './cabeza-del-editor'

// El editor de una fórmula del origen: la cabeza («‹ Fórmulas», el nombre, el estado, el «⋯», las sub-pestañas Planilla · Hoja · Tarjeta y «Empezar desde una
// plantilla»), que lee la sesión y la fórmula tras su `<Suspense>`, y debajo la sub-pestaña abierta con su `loading.tsx`. No protege: cada página comprueba
// sola (`abrirFormula()`). Una fórmula archivada dibuja en la cabeza su aviso y las páginas, nada.
export default function LayoutDeLaFormula({
  children,
  params,
}: LayoutProps<'/configuracion/origenes/[id]/formulas/[formula]'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense
        fallback={
          <div className="grid gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-9 w-64 max-w-full" />
          </div>
        }
      >
        {params.then(({ id, formula }) => (
          <CabezaDelEditor origenId={id} formulaId={formula} />
        ))}
      </Suspense>
      {children}
    </div>
  )
}
