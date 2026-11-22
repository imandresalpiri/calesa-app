'use client'

import { useState, type RefObject } from 'react'
import type {
  ContenidoDeLaCelda,
  TextoConDatos,
  TextoSimple,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { primerDato } from '../../../../../entities/plantilla/edicion/condiciones'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { CampoDelTexto } from './campo-del-texto'
import { ArmadorDeCondicionesDiferido, ListaDeRespaldoDiferida } from './diferidos'
import { ElegirDato } from './elegir-dato'
import { OpcionesEnFila } from './opciones-en-fila'

// «Contenido»: la lista de respaldo y las condiciones son «Dato» (cuál, lo dice «Cuál dato»).
type Tipo = Exclude<ContenidoDeLaCelda['tipo'], 'respaldo' | 'condiciones'>
type Cual = 'uno' | 'respaldo' | 'condiciones'

type Props = {
  contenido: ContenidoDeLaCelda | null
  // La clave que junta en un solo paso lo que se escribe en esta celda.
  clave: string
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  // El primer control de «Contenido» (Enter o F2 sobre un dato o el logo lo enfocan).
  enfoque: RefObject<HTMLDivElement | null>
  alCambiar: (contenido: ContenidoDeLaCelda, clave?: string) => void
  // Ctrl+Z y Ctrl+Y dentro del campo del texto (el navegador no deshace lo que dibuja el modelo).
  alDeshacer: () => void
  alRehacer: () => void
}

const TIPOS = [
  { valor: 'texto', texto: 'Texto' },
  { valor: 'dato', texto: 'Dato' },
  { valor: 'logo', texto: 'Logo' },
  { valor: 'foto_del_asesor', texto: 'Foto del asesor' },
  { valor: 'vacio', texto: 'Vacío' },
] as const

const CUAL = [
  { valor: 'uno', texto: 'Uno' },
  { valor: 'respaldo', texto: 'El primero con valor' },
  { valor: 'condiciones', texto: 'Según condiciones' },
] as const

const tipoDe = (c: ContenidoDeLaCelda | null): Tipo =>
  c === null ? 'vacio' : c.tipo === 'respaldo' || c.tipo === 'condiciones' ? 'dato' : c.tipo
const cualDe = (c: ContenidoDeLaCelda | null): Cual =>
  c?.tipo === 'respaldo' || c?.tipo === 'condiciones' ? c.tipo : 'uno'

const textoDe = (c: ContenidoDeLaCelda | null): TextoSimple | TextoConDatos =>
  c?.tipo === 'texto' ? c : { tipo: 'texto', texto: '' }

// Elegir el tipo: Texto (con el texto de antes, y sus datos, si lo tenía), Logo, Foto del asesor o Vacío cambian la celda; Dato espera a que se elija uno.
function contenidoDelTipo(t: Tipo, actual: ContenidoDeLaCelda | null): ContenidoDeLaCelda | null {
  if (t === 'texto') return textoDe(actual)
  return t === 'logo' || t === 'foto_del_asesor' || t === 'vacio' ? { tipo: t } : null
}

type PropsDelDato = Pick<Props, 'contenido' | 'clave' | 'contexto' | 'nombrados' | 'alCambiar'>

// «Dato»: «Cuál dato» (Uno | El primero con valor | Según condiciones) y lo suyo. Pasar a la lista o a las condiciones arma desde el dato de la celda y no la cambia
// hasta completarlas; volver a «Uno» deja su primer dato.
function CampoDelDato({ contenido, clave, contexto, nombrados, alCambiar }: PropsDelDato) {
  const deLaCelda = cualDe(contenido)
  const [cual, setCual] = useState<Cual>(deLaCelda)
  const [previo, setPrevio] = useState(deLaCelda)
  if (deLaCelda !== previo) {
    setPrevio(deLaCelda)
    setCual(deLaCelda)
  }
  return (
    <div className="grid min-w-0 gap-2">
      <OpcionesEnFila
        etiqueta="Cuál dato"
        valor={cual}
        opciones={CUAL}
        alElegir={(c) => {
          setCual(c)
          const primero = primerDato(contenido)
          if (c === 'uno' && deLaCelda !== 'uno' && primero !== null) alCambiar(primero)
        }}
      />
      {cual === 'uno' ? (
        <ElegirDato
          actual={contenido?.tipo === 'dato' ? contenido : null}
          contexto={contexto}
          nombrados={nombrados}
          alElegir={alCambiar}
        />
      ) : null}
      {cual === 'respaldo' ? (
        <ListaDeRespaldoDiferida
          contenido={contenido}
          contexto={contexto}
          nombrados={nombrados}
          alCambiar={alCambiar}
        />
      ) : null}
      {cual === 'condiciones' ? (
        <ArmadorDeCondicionesDiferido
          contenido={contenido}
          clave={clave}
          contexto={contexto}
          nombrados={nombrados}
          alCambiar={alCambiar}
        />
      ) : null}
    </div>
  )
}

// «Contenido» de lo elegido: Texto | Dato | Logo | Foto del asesor | Vacío. Elegir «Dato» muestra «Cuál dato» y no cambia la celda hasta elegir uno; un texto que
// empieza con «=» es texto.
export function CampoDelContenido({
  contenido,
  clave,
  contexto,
  nombrados,
  enfoque,
  alCambiar,
  alDeshacer,
  alRehacer,
}: Props) {
  const tipoDeLaCelda = tipoDe(contenido)
  const [tipo, setTipo] = useState<Tipo>(tipoDeLaCelda)
  const [deLaCelda, setDeLaCelda] = useState(tipoDeLaCelda)
  if (tipoDeLaCelda !== deLaCelda) {
    setDeLaCelda(tipoDeLaCelda)
    setTipo(tipoDeLaCelda)
  }
  return (
    <div className="grid min-w-0 gap-2">
      <div
        ref={enfoque}
        tabIndex={-1}
        className="outline-none focus-visible:shadow-(--shadow-focus)"
        data-campo-del-contenido=""
      >
        <OpcionesEnFila
          etiqueta="Contenido"
          valor={tipo}
          opciones={TIPOS}
          alElegir={(t) => {
            setTipo(t)
            const nuevo = contenidoDelTipo(t, contenido)
            if (nuevo !== null) alCambiar(nuevo)
          }}
        />
      </div>
      {tipo === 'texto' ? (
        <CampoDelTexto
          contenido={textoDe(contenido)}
          clave={clave}
          contexto={contexto}
          nombrados={nombrados}
          alCambiar={alCambiar}
          alDeshacer={alDeshacer}
          alRehacer={alRehacer}
        />
      ) : null}
      {tipo === 'dato' ? (
        <CampoDelDato
          contenido={contenido}
          clave={clave}
          contexto={contexto}
          nombrados={nombrados}
          alCambiar={alCambiar}
        />
      ) : null}
    </div>
  )
}
