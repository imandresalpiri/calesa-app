import { connection } from 'next/server'
import { leerMisEnlacesDeAyuda } from '@/modules/empresa'
import { TarjetaDeMisEnlaces } from '@/modules/empresa/pantallas/perfil'
import { datosO } from '@/shared/lib/errores'

// La tarjeta «Ayuda»: los enlaces de ayuda de quien mira, de una sola lectura (`enlaces_de_ayuda_de_mi()`).
export async function AyudaSeccion() {
  await connection()
  const leidos = datosO(await leerMisEnlacesDeAyuda())
  return <TarjetaDeMisEnlaces leidos={leidos} />
}
