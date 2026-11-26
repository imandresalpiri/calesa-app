'use client'

import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import {
  CREAR,
  SIN_VALOR,
  TOPE_DE_CATALOGO,
  opcionesDelCombo,
  type ElementoDeCatalogo,
  type OpcionDelCombo,
} from '@/shared/lib/catalogo'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/ui/command'
import type { PropsDeLaLista } from './tipos'

const RENGLON = 'min-h-11 md:min-h-8'
const NOTA = 'px-3 pt-1.5 text-(length:--text-xs)'

// La lista del combo: buscar sin importar mayúsculas, tildes ni espacios, «Sin …» primero, las coincidencias en el orden del catálogo y
// «Crear «x»» al final si lo escrito no existe. Enter toma la exacta o la primera (`opcionesDelCombo()`, no cmdk).
export function ListaDelCombo(props: PropsDeLaLista) {
  const { valor, elementos, textos } = props
  const [texto, setTexto] = useState('')
  const [resaltada, setResaltada] = useState('')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const lista = opcionesDelCombo({
    elementos,
    valorActual: valor,
    texto,
    puedeCrear: props.puedeCrear,
  })
  const { existente, crear } = lista

  async function crearEscrito(nombre: string) {
    setCreando(true)
    setMotivo(null)
    const rechazo = await props.alCrear(nombre)
    setCreando(false)
    setMotivo(rechazo)
  }

  return (
    <Command
      shouldFilter={false}
      label={textos.buscar}
      value={resaltada || lista.resaltada}
      onValueChange={setResaltada}
    >
      <CommandInput
        value={texto}
        autoFocus
        onValueChange={(nuevo) => {
          setTexto(nuevo)
          setMotivo(null)
          setResaltada('')
        }}
        placeholder={textos.buscar}
        maxLength={props.maximoDelNombre}
      />
      <NotasDelCombo
        existente={existente}
        motivo={motivo}
        vacio={elementos.length === 0 && texto.trim() === ''}
        textos={textos}
      />
      <CommandList>
        <CommandGroup>
          <RenglonesDelCombo
            valor={valor}
            opciones={lista.opciones}
            crear={crear}
            creando={creando}
            textos={textos}
            alElegir={props.alElegir}
            alCrear={(nombre) => void crearEscrito(nombre)}
          />
        </CommandGroup>
      </CommandList>
      {props.hayMas ? (
        <p className={`${NOTA} pb-2 text-(--color-ink-soft)`}>
          Mostrando los primeros {TOPE_DE_CATALOGO}.
        </p>
      ) : null}
    </Command>
  )
}

type PropsDeLasNotas = {
  existente: ElementoDeCatalogo | null
  motivo: string | null
  vacio: boolean
  textos: PropsDeLaLista['textos']
}

// Lo que se dice sobre la lista: que lo escrito ya existe (o existe inactivo), por qué no se pudo crear y el catálogo vacío.
function NotasDelCombo({ existente, motivo, vacio, textos }: PropsDeLasNotas) {
  return (
    <>
      {existente ? (
        <p role="status" className={`${NOTA} text-(--color-ink-soft)`}>
          {existente.activo ? textos.existe(existente.nombre) : textos.inactivo(existente.nombre)}
        </p>
      ) : null}
      {motivo ? (
        <p role="alert" className={`${NOTA} text-(--color-peligro-ink)`}>
          {motivo}
        </p>
      ) : null}
      {vacio ? <p className={`${NOTA} text-(--color-ink-soft)`}>{textos.vacio}</p> : null}
    </>
  )
}

type PropsDeLosRenglones = {
  valor: string | null
  opciones: readonly OpcionDelCombo[]
  crear: string | null
  creando: boolean
  textos: PropsDeLaLista['textos']
  alElegir: (id: string | null) => void
  alCrear: (nombre: string) => void
}

// «Sin …» primero, las coincidencias en el orden del catálogo (con «(inactivo)» la elegida que ya no está activa) y «Crear «x»» al final.
function RenglonesDelCombo({
  valor,
  opciones,
  crear,
  creando,
  textos,
  alElegir,
  alCrear,
}: PropsDeLosRenglones) {
  return (
    <>
      <CommandItem
        value={SIN_VALOR}
        data-checked={valor === null}
        className={RENGLON}
        onSelect={() => {
          alElegir(null)
        }}
      >
        <span className="text-(--color-ink-soft)">{textos.sinValor}</span>
      </CommandItem>
      {opciones.map((opcion) => (
        <CommandItem
          key={opcion.id}
          value={opcion.id}
          data-checked={opcion.id === valor}
          className={RENGLON}
          onSelect={() => {
            alElegir(opcion.id)
          }}
        >
          <span className="truncate">
            {opcion.nombre}
            {opcion.inactivo ? ' (inactivo)' : ''}
          </span>
        </CommandItem>
      ))}
      {crear === null ? null : (
        <CommandItem
          value={CREAR}
          disabled={creando}
          className={RENGLON}
          onSelect={() => {
            alCrear(crear)
          }}
        >
          <PlusIcon aria-hidden />
          <span className="truncate">{textos.crear(crear)}</span>
        </CommandItem>
      )}
    </>
  )
}
