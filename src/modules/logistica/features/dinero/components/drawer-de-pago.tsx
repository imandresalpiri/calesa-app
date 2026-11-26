'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { Skeleton } from '@/shared/ui/skeleton'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import type { Pago } from '../../../entities/dinero/pago'
import { avisarCambioDeDinero } from '../hooks/eventos-de-dinero'
import { useFormularioDePago } from '../hooks/use-formulario-de-pago'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { CamposDePago } from './campos-de-pago'
import { LecturaDelPago } from './lectura-del-pago'

const SIN_ORIGENES: readonly string[] = []

type Props = {
  abierto: boolean
  alCerrar: () => void
  unidadId: string
  // Nulo = «Registrar pago».
  original: Pago | null
  // Cada apertura empieza de cero: un id de intento nuevo y los campos de lo guardado.
  apertura: number
  // Sin `puedeEditar`, un pago existente se mira sin campos; sin `puedeConfirmar`, la lectura no ofrece «Anular pago».
  permisos: { puedeEditar: boolean; puedeConfirmar: boolean }
  // «Anular pago» de la lectura de un confirmado: pasa al diálogo de anulación.
  alAnular: () => void
}

const MOTIVO_CONFIRMADO =
  'Un pago confirmado queda sellado. Para corregirlo, anúlalo y registra otro.'
const MOTIVO_SIN_PERMISO = 'No tienes permiso para corregir este pago.'

// Un pago existente se edita sólo si está sin confirmar y quien mira puede editar; si no, se lee.
function soloSeLee(original: Pago | null, puedeEditar: boolean): boolean {
  return original !== null && (original.confirmado || !puedeEditar)
}

type ContenidoProps = Omit<Props, 'abierto' | 'apertura' | 'permisos' | 'alAnular'> & {
  abierto: boolean
  opciones: OpcionesDeGasto
}

function Formulario({ abierto, alCerrar, unidadId, original, opciones }: ContenidoProps) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDePago({ unidadId, original, opciones, alCerrar, abierto })
  // Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(f.hayCambios, f.descartarBorrador)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={f.enLinea}
          esperandoConexion={f.esperandoConexion}
          enCurso={f.enCurso}
          conflicto={f.conflicto}
          aviso={f.aviso}
          detalleDelConflicto="Recargar trae la versión de la otra persona y descarta lo que escribiste."
          alReintentar={() => void f.enviar()}
          alRecargar={() => {
            // La versión nueva llega con la lista; lo escrito se descarta a propósito.
            f.descartarBorrador()
            avisarCambioDeDinero(unidadId)
            alCerrar()
          }}
        />
        <CamposDePago unidadId={unidadId} original={original} opciones={opciones} formulario={f} />
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={original ? 'Guardar' : 'Registrar pago'}
      />
    </div>
  )
}

// Mide lo que el formulario: el monto con su fecha y concepto, tres grupos y la zona del comprobante.
function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-5">
      <Skeleton className="h-36" />
      <Skeleton className="h-24" />
      <Skeleton className="h-28" />
      <Skeleton className="h-56" />
    </div>
  )
}

type Opciones = ReturnType<typeof useOpcionesDeGasto>

// El cuerpo del formulario según lo que leyeron las opciones: esqueleto, error con «Reintentar» o el formulario (que se reinicia con cada apertura y con la versión de lo guardado).
function CuerpoDelFormulario({
  opciones,
  apertura,
  ...resto
}: Omit<ContenidoProps, 'opciones'> & { opciones: Opciones; apertura: number }) {
  if (opciones.tipo === 'error') {
    return (
      <div className="grid gap-3">
        <Aviso tono="peligro">
          <p>{opciones.error.mensaje}</p>
        </Aviso>
        <Button variant="outline" onClick={opciones.reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (opciones.tipo === 'cargando') {
    return <Cargando />
  }
  return (
    <Formulario
      key={`${String(apertura)}-${resto.original?.id ?? 'nuevo'}-${resto.original?.actualizadoEn ?? ''}`}
      {...resto}
      opciones={opciones.opciones}
    />
  )
}

// El panel de un pago (`?panel=pago&pago=<id|nuevo>`): «Registrar pago» y «Editar pago», o «Pago» en sólo lectura. Lee las monedas y los tipos de cambio al abrirse; el drawer se queda montado
// (cerrado) y lo de adentro cambia del esqueleto al formulario o a la lectura. El contrato de cierre con algo escrito es de `<Drawer>` y `useCambiosSinGuardar`.
export function DrawerDePago({
  abierto,
  alCerrar,
  unidadId,
  original,
  apertura,
  permisos,
  alAnular,
}: Props) {
  const lectura = soloSeLee(original, permisos.puedeEditar)
  // Un pago no elige categoría: le bastan las monedas y los tipos de cambio; mirarlo no lee nada.
  const opciones = useOpcionesDeGasto(abierto && !lectura, apertura, SIN_ORIGENES)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={lectura ? 'Pago' : original ? 'Editar pago' : 'Registrar pago'}
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      {lectura && original ? (
        <LecturaDelPago
          unidadId={unidadId}
          pago={original}
          motivo={original.confirmado ? MOTIVO_CONFIRMADO : MOTIVO_SIN_PERMISO}
          puedeAnular={original.confirmado && permisos.puedeConfirmar}
          alAnular={alAnular}
          alCerrar={alCerrar}
        />
      ) : (
        <CuerpoDelFormulario
          opciones={opciones}
          apertura={apertura}
          abierto={abierto}
          alCerrar={alCerrar}
          unidadId={unidadId}
          original={original}
        />
      )}
    </Drawer>
  )
}
