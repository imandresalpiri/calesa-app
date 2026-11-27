// El terreno de los e2e de documentos (6.06): el de mover (un origen `e2e_…` con A → B → C, un vehículo en B y el tipo «E2E BL <proyecto>» que pide C) y una persona que sólo puede subir:
// `logistica.ver`, `vehiculos.ver` y `logistica.documentos.subir` del origen, y otra que aprueba (`logistica.documentos.aprobar`, más `flujos.mover` para ver «Qué falta»).
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { fotos } from './fotos'
import { borrarMover, sembrarMover, type TerrenoDeMover } from './mover'

export type TerrenoDeDocumentos = TerrenoDeMover & {
  quienSube: { correo: string; nombre: string }
  quienAprueba: { correo: string; nombre: string }
}

export async function sembrarDocumentos(proyecto: string): Promise<TerrenoDeDocumentos> {
  const terreno = await sembrarMover(proyecto)
  const correo = correoDePrueba(`sube-documentos-${proyecto}`)
  const nombre = 'Sara Sube'
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}sube documentos ${proyecto}`,
      clave: `e2e_sube_documentos_${proyecto}`,
    },
    permisos: ['logistica.ver', 'vehiculos.ver', 'logistica.documentos.subir'].map((clave) => ({
      clave,
      origenId: terreno.origen.id,
    })),
  })
  const aprueba = correoDePrueba(`aprueba-documentos-${proyecto}`)
  const nombreDeQuienAprueba = 'Ana Aprueba'
  await crearPersona({
    email: aprueba,
    contrasena: CONTRASENA,
    nombre: nombreDeQuienAprueba,
    invitada: true,
  })
  await darRolDePrueba({
    email: aprueba,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}aprueba documentos ${proyecto}`,
      clave: `e2e_aprueba_documentos_${proyecto}`,
    },
    permisos: [
      'logistica.ver',
      'vehiculos.ver',
      'flujos.mover',
      'logistica.documentos.aprobar',
    ].map((clave) => ({
      clave,
      origenId: terreno.origen.id,
    })),
  })
  return {
    ...terreno,
    quienSube: { correo, nombre },
    quienAprueba: { correo: aprueba, nombre: nombreDeQuienAprueba },
  }
}

// Quita el terreno de mover (los documentos caen con los vehículos). Las personas y los roles los limpia el spec.
export const borrarDocumentos = borrarMover

export type DocumentoSembrado = { id: string; nombre: string; ruta: string }

const BUCKET = 'documentos'

// Los archivos y las filas de una unidad con archivo de verdad en el bucket: dos imágenes y un PDF, en este orden de creación (`foto-1.png`, `bl.pdf`, `foto-2.png`), todos «subido». La lista los agrupa
// por tipo y los ordena por la base: una prueba no supone el orden, lo lee.
export async function sembrarArchivosDeDocumentos(
  terreno: TerrenoDeDocumentos,
  vehiculoId: string,
): Promise<DocumentoSembrado[]> {
  const cliente = admin()
  const imagen = (n: number) => ({
    nombre: `foto-${String(n)}.png`,
    mime: 'image/png',
    cuerpo: fotos(n)[0]?.buffer ?? Buffer.alloc(0),
  })
  const archivos = [
    imagen(1),
    {
      nombre: 'bl.pdf',
      mime: 'application/pdf',
      cuerpo: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
    },
    imagen(2),
  ]
  const sembrados: DocumentoSembrado[] = []
  for (const archivo of archivos) {
    const ruta = `${vehiculoId}/e2e-${archivo.nombre}`
    const subida = await cliente.storage
      .from(BUCKET)
      .upload(ruta, archivo.cuerpo, { contentType: archivo.mime, upsert: true })
    if (subida.error) throw new Error(`No se pudo subir ${archivo.nombre}: ${subida.error.message}`)
    const { data, error } = await cliente
      .from('documentos')
      .insert({
        vehiculo_id: vehiculoId,
        tipo_documento_id: terreno.tipoDeBl.id,
        nombre_archivo: archivo.nombre,
        mime: archivo.mime,
        ruta,
        bytes: archivo.cuerpo.length,
      })
      .select('id')
      .single<{ id: string }>()
    if (error) throw new Error(`No se pudo registrar ${archivo.nombre}: ${error.message}`)
    sembrados.push({ id: data.id, nombre: archivo.nombre, ruta })
  }
  return sembrados
}

// Quita los objetos que sembró `sembrarArchivosDeDocumentos` (las filas caen con el vehículo).
export async function borrarArchivosDeDocumentos(
  sembrados: readonly DocumentoSembrado[],
): Promise<void> {
  if (sembrados.length === 0) return
  await admin()
    .storage.from(BUCKET)
    .remove(sembrados.map((d) => d.ruta))
}
