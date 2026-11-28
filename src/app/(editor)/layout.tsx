import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'
import { MarcoDelEditor } from '@/modules/artes/pantallas/artes-plantilla'
import { getAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { EstiloDeMarca } from '@/shared/ui/estilo-de-marca'
import { SimbolosDeLista } from '@/shared/ui/lista/simbolos-de-lista'
import { ProveedorDelLive } from '@/shared/ui/proveedor-del-live'
import { ProveedorRegional } from '@/shared/ui/regional'

// Lo que el editor toma de la sesión y de la empresa, sin el marco de `(app)` (ni menú ni barra): cómo se escriben los números, el color de
// la marca, los iconos del «⋯» y el Modo Live (si se apaga o cambia en otra pestaña, la pantalla se vuelve a leer).
async function MarcoDeSesion({ children }: { children: ReactNode }) {
  await connection()
  const [sesion, ajustes] = await Promise.all([requerirSesion(), getAjustes()])
  return (
    <ProveedorRegional
      locale={ajustes.locale}
      monedaBase={ajustes.monedaBase}
      zonaHoraria={ajustes.zonaHoraria}
      zonaDeLaPersona={sesion.preferencias.zonaHoraria}
    >
      <EstiloDeMarca color={ajustes.colorAcento} />
      <SimbolosDeLista />
      <ProveedorDelLive
        puedeEncender={sesion.live.puedeEncender}
        enElServidor={sesion.live.encendido}
      >
        {children}
      </ProveedorDelLive>
    </ProveedorRegional>
  )
}

// Las pantallas a pantalla completa con sesión: hoy, el editor de artes (`/artes/<id>`). La cáscara estática es el marco del editor en frío,
// el mismo de su `loading.tsx`: nada salta al llegar la sesión ni la plantilla.
export default function LayoutDelEditor({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-(--color-paper)">
      <Suspense fallback={<MarcoDelEditor />}>
        <MarcoDeSesion>{children}</MarcoDeSesion>
      </Suspense>
    </main>
  )
}
