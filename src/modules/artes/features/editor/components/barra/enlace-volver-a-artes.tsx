import { ArrowLeftIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'

// «Volver a Artes» de la barra del editor, el mismo en frío (a `/artes`) y con el código (a la lista como se dejó, `useVolverAArtes()`). Puro.
export function EnlaceVolverAArtes({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-8 shrink-0' })}
    >
      <ArrowLeftIcon aria-hidden />
      Volver a Artes
    </Link>
  )
}
