// El asistente de IA en los e2e: un proveedor falso compatible con OpenAI que levanta el propio spec, y la fila `asistente_ia` como la deja
// la migración. La fila es global: el spec que la usa corre en serie y la restaura antes y después.
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { CONFIG_DEL_ASISTENTE_POR_DEFECTO } from '../../src/modules/empresa/entities/asistente-ia/config'
import { DOMINIO_E2E } from './base'
import { literal, sql } from './sql'

// Con esta clave el proveedor falso contesta 401, como uno de verdad con una clave mala.
export const PREFIJO_DE_CLAVE_INVALIDA = 'e2e-clave-invalida'

export const TEXTO_DEL_SERVIDOR_FALSO = 'Texto del servidor falso'

export type PedidoAlProveedor = {
  metodo: string | undefined
  ruta: string | undefined
  cabeceras: IncomingHttpHeaders
  cuerpo: unknown
}

export type ServidorFalso = {
  urlBase: string
  pedidos: PedidoAlProveedor[]
  cerrar: () => Promise<void>
}

// `http.createServer` en `127.0.0.1:0`: guarda cada pedido y contesta 401 con la clave inválida o 200 con un texto.
export async function levantarServidorFalso(): Promise<ServidorFalso> {
  const pedidos: PedidoAlProveedor[] = []
  const servidor: Server = createServer((pedido, respuesta) => {
    let cuerpo = ''
    pedido.on('data', (parte: Buffer) => {
      cuerpo += parte.toString('utf8')
    })
    pedido.on('end', () => {
      pedidos.push({
        metodo: pedido.method,
        ruta: pedido.url,
        cabeceras: pedido.headers,
        cuerpo: cuerpo ? (JSON.parse(cuerpo) as unknown) : null,
      })
      const invalida = pedido.headers.authorization?.startsWith(
        `Bearer ${PREFIJO_DE_CLAVE_INVALIDA}`,
      )
      respuesta.writeHead(invalida ? 401 : 200, { 'content-type': 'application/json' })
      respuesta.end(
        invalida
          ? JSON.stringify({ error: { message: 'invalid api key' } })
          : JSON.stringify({ choices: [{ message: { content: TEXTO_DEL_SERVIDOR_FALSO } }] }),
      )
    })
  })
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo))
  const { port } = servidor.address() as AddressInfo
  return {
    urlBase: `http://127.0.0.1:${String(port)}/v1`,
    pedidos,
    cerrar: () => new Promise<void>((listo) => servidor.close(() => listo())),
  }
}

// La config de fábrica con las claves de la base: la misma que siembra la migración (lo compara `supabase/tests/areas/empresa/asistente-ia.sql`
// contra los atajos de `config.test.ts`).
function configDeFabrica(): string {
  const { preajuste, urlBase, modelo, promptBase, atajos } = CONFIG_DEL_ASISTENTE_POR_DEFECTO
  return JSON.stringify({
    preajuste,
    url_base: urlBase,
    modelo,
    prompt_base: promptBase,
    atajos: atajos.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      instruccion: a.instruccion,
      activo: a.activo,
      max_tokens: a.maxTokens,
    })),
  })
}

// Como la deja la migración: apagado, sin clave, con la config de fábrica y sin los usos de las personas de prueba (también se van con ellas,
// en cascada).
export function dejarElAsistenteComoEnLaMigracion(): void {
  sql(`
    delete from vault.secrets where name = 'integracion:asistente_ia';
    update public.integraciones
       set activa = false, config = ${literal(configDeFabrica())}::jsonb, secreto_guardado_en = null
     where clave = 'asistente_ia';
    delete from public.asistente_ia_usos u
     using public.perfiles p
     where p.id = u.usuario_id and p.email like ${literal(`%@${DOMINIO_E2E}`)};`)
}

// Cuenta un uso como lo cuenta el servidor tras un 2xx: `asistente_ia_contar_uso()` con la sesión de la persona.
export function contarUnUso(email: string): void {
  const id = sql(`select id from public.perfiles where email = ${literal(email)};`)
  const claims = JSON.stringify({ sub: id, role: 'authenticated' })
  sql(`begin;
    select set_config('request.jwt.claim.sub', ${literal(id)}, true), set_config('request.jwt.claims', ${literal(claims)}, true) \\g /dev/null
    set local role authenticated;
    select public.asistente_ia_contar_uso() \\g /dev/null
    commit;`)
}
