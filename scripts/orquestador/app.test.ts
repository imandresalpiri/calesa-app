import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cuerpo, escenario, TIEMPO } from './prueba/escenario'

// GitHub como la app del orquestador (app.sh, README.md › «Como la app de GitHub»), en el escenario de siempre (prueba/escenario.ts):
// el guion real con el gh falso y un curl falso que hace de GitHub para token-app.sh. La clave se genera aquí; nada sale a la red.
const CURL_FALSO = resolve('scripts/orquestador/prueba/curl-falso.sh')
const TOKEN = 'ghs_deLaApp'

let raiz = ''
let clave = ''
beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'orq-app-'))
  clave = join(raiz, 'clave.pem')
  execFileSync(
    'openssl',
    ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', clave],
    { stdio: 'ignore' },
  )
  chmodSync(clave, 0o600)
})
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

/** El escenario con la app configurada (APP_ID 123, instalación 77) y su clave en `rutaClave`. Sin APP_LOGIN: el login de la app
 * sale de la caché del token (`mi-app[bot]`, del `GET /app` del curl falso); `extra` suma o pisa configuración. */
function conApp(rutaClave = clave, extra = '') {
  const t = escenario(
    `APP_ID="123"\nAPP_INSTALACION="77"\nAPP_CLAVE="${rutaClave}"\nAPP_LOGIN=""\nexport APP_API="http://github.falso"\n${extra}`,
  )
  const falso = join(t.falso, 'curl')
  mkdirSync(falso)
  writeFileSync(
    join(t.falso, 'bin/curl'),
    `#!/usr/bin/env bash\nCURL_FALSO=${falso} exec bash ${CURL_FALSO} "$@"\n`,
    { mode: 0o755 },
  )
  writeFileSync(
    join(falso, 'respuestas.json'),
    JSON.stringify({
      'POST /app/installations/77/access_tokens': {
        status: 201,
        body: {
          token: TOKEN,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          permissions: { issues: 'write' },
        },
      },
      'GET /app': { status: 200, body: { slug: 'mi-app' } },
    }),
  )
  const tokens = () => t.llamadas().map((l) => l.token)
  // Lo que imprime el guion, sin el aviso de bash de lo que el escenario no copia (scripts/flujo/cola-de-integracion.sh).
  const lineas = (guion: string) =>
    t
      .funciones(guion)
      .salida.split('\n')
      .filter((l) => !l.includes('No such file or directory'))
  const avisos = () =>
    t
      .log()
      .split('\n')
      .filter((l) => l.includes('AVISO · GitHub sin la app'))
  return { ...t, tokens, avisos, lineas }
}

describe('como la app', () => {
  it(
    'espejo, comentar y nueva salen con el token de la app',
    () => {
      const t = conApp()
      t.issue(5, cuerpo('feat/cinco'))
      t.orq('espejo')
      expect(t.est('T5', 'issue')).toBe('5')
      t.funciones('token_gh; comentar T5 hola >/dev/null')
      expect(t.orq('nueva', 'tema-de-la-app').salida).toContain('issue')
      expect(t.llamadas().some((l) => l.args.join(' ').includes('issues/5/comments'))).toBe(true)
      expect(
        t.llamadas().some((l) => l.args.includes('POST') && l.args.at(3)?.endsWith('/issues')),
      ).toBe(true)
      expect(new Set(t.tokens())).toEqual(new Set([TOKEN]))
    },
    TIEMPO,
  )

  it(
    'el envoltorio de gh renueva un ghs_ vencido, respeta un gho_ puesto a propósito y es ejecutable',
    () => {
      const t = conApp()
      t.funciones(
        'token_gh; GH_TOKEN=ghs_vencido gh api "repos/{owner}/{repo}/labels" >/dev/null; GH_TOKEN=gho_mio gh api "repos/{owner}/{repo}/labels" >/dev/null',
      )
      expect(t.tokens()).toEqual([TOKEN, 'gho_mio'])
      const gh = 'scripts/orquestador/gh-app/gh'
      expect(statSync(resolve(gh)).mode & 0o111).not.toBe(0)
      expect(execFileSync('git', ['ls-files', '-s', gh], { encoding: 'utf8' })).toMatch(/^100755 /)
    },
    TIEMPO,
  )

  it(
    'git usa el helper de la app, último, tras vaciar los de la máquina; un GIT_CONFIG_COUNT previo se respeta',
    () => {
      const t = conApp()
      const helpers = t.lineas('token_gh; git -C "$REPO" config --get-all credential.helper')
      helpers.pop()
      expect(helpers.at(-1)).toBe(
        `!bash '${join(t.repo, 'scripts/orquestador/token-app.sh')}' credencial`,
      )
      expect(helpers.at(-2)).toBe('')
      const previo = t.lineas(
        'export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.abbrev GIT_CONFIG_VALUE_0=9; token_gh; echo "$GIT_CONFIG_COUNT"; git -C "$REPO" config core.abbrev',
      )
      expect(previo.filter(Boolean)).toEqual(['3', '9'])
    },
    TIEMPO,
  )
})

describe('sin la clave', () => {
  it(
    'sigue con la sesión de la persona, avisa una vez y, al volver la clave, vuelve a la app',
    () => {
      const ruta = join(mkdtempSync(join(raiz, 'sin-')), 'app.pem')
      const t = conApp(ruta)
      t.issue(5, cuerpo('feat/cinco'))
      t.orq('espejo')
      t.orq('espejo')
      expect(new Set(t.tokens())).toEqual(new Set(['tok-Cuenta']))
      expect(t.avisos()).toHaveLength(1)
      expect(t.avisos()[0]).toContain(ruta)
      copyFileSync(clave, ruta)
      const antes = t.llamadas().length
      t.orq('espejo')
      expect(t.log()).toContain('GitHub: vuelvo a actuar como la app')
      expect(t.avisos()).toHaveLength(1)
      expect(new Set(t.tokens().slice(antes))).toEqual(new Set([TOKEN]))
    },
    TIEMPO,
  )
})

describe('quién es de confianza', () => {
  // La forma que devuelve GitHub (gh api repos/{owner}/{repo}/issues/<n>) para un issue que la app abre con su token de instalación:
  // CONTRIBUTOR, de tipo Bot, con su login `<slug>[bot]` y sin performed_via_github_app.
  const issueDeApp = (login: string, extra: object = {}) =>
    JSON.stringify({
      author_association: 'CONTRIBUTOR',
      user: { login, type: 'Bot' },
      performed_via_github_app: null,
      ...extra,
    })

  it(
    'con_permiso acepta un issue de la app del orquestador y rechaza el de otra app',
    () => {
      const t = conApp()
      const propio = issueDeApp('mi-app[bot]')
      // Si GitHub llenara performed_via_github_app, también vale el id.
      const porId = issueDeApp('otro-nombre[bot]', { performed_via_github_app: { id: 123 } })
      const r = t.lineas(
        [
          `token_gh; con_permiso '${propio}' && echo propia`,
          `con_permiso '${porId}' && echo por-id`,
          `con_permiso '${issueDeApp('otra-app[bot]')}' || echo ajena`,
          `ORQ_SIN_APP=1 con_permiso '${propio}' || echo apagada`,
        ].join('; '),
      )
      expect(r.filter(Boolean)).toEqual(['propia', 'por-id', 'ajena', 'apagada'])
    },
    TIEMPO,
  )

  it(
    'kit_semanal y cierre_abierto cuentan el issue que abrió la app y no crean otro',
    () => {
      const t = conApp()
      mkdirSync(join(t.repo, '.kit'))
      writeFileSync(join(t.repo, '.kit/version'), 'abc\n')
      mkdirSync(join(t.repo, 'scripts/kit'), { recursive: true })
      writeFileSync(join(t.repo, 'scripts/kit/actualizar.mjs'), 'process.exit(10)\n')
      for (const [n, etiqueta] of [
        [7, 'kit'],
        [8, 'cierre'],
      ] as const) {
        t.issue(n, 'x', [etiqueta])
        t.cambiarGh((g) => {
          Object.assign(g.issues[n] ?? {}, {
            autor: 'CONTRIBUTOR',
            login: 'mi-app[bot]',
            tipo: 'Bot',
          })
        })
      }
      const r = t.funciones(
        'token_gh; KIT_SEMANAL=si; kit_semanal; cierre_abierto && echo hay-cierre',
      )
      expect(r.salida).toContain('hay-cierre')
      expect(existsSync(join(t.datos, 'estado/.kit-semana'))).toBe(true)
      expect(t.llamadas().filter((l) => l.args.includes('POST'))).toEqual([])
    },
    TIEMPO,
  )
})

describe('verificar', () => {
  it(
    'verificar_login_app dice cómo se reconoce a la app',
    () => {
      const linea = (t: ReturnType<typeof conApp>, guion: string) => t.lineas(guion).filter(Boolean)
      expect(
        linea(
          conApp(clave, 'APP_LOGIN="mi-app[bot]"\n'),
          'token_gh; verificar_login_app; echo "rc=$?"',
        ),
      ).toEqual(['✓ un issue de mi-app[bot] entra a la cola como uno de la persona', 'rc=0'])
      expect(
        linea(
          conApp(clave, 'APP_LOGIN="otra[bot]"\n'),
          'token_gh; verificar_login_app; echo "rc=$?"',
        ),
      ).toEqual([
        '✗ APP_LOGIN (otra[bot]) no es el login de la app (mi-app[bot]): corrígelo en config.env',
        'rc=1',
      ])
      expect(linea(conApp(clave, 'ORQ_SIN_APP=1\n'), 'verificar_login_app; echo "rc=$?"')).toEqual([
        '· ORQ_SIN_APP=1: un issue que abra la app no entra a la cola',
        'rc=0',
      ])
    },
    TIEMPO,
  )
})

describe('el permiso que le falta a la app', () => {
  it(
    'el log, el último error y un solo aviso nombran el permiso',
    () => {
      const t = conApp()
      t.issue(5, cuerpo('feat/cinco'))
      t.cambiarGh((g) => {
        g.sinPermisoApp = ['issue edit']
      })
      t.funciones('token_gh; ghc issue edit 5 --add-label x; ghc issue edit 5 --add-label y')
      expect(readFileSync(join(t.datos, 'estado/.gh-ultimo-error'), 'utf8')).toContain(
        'La app mi-app no tiene «issues: write» en Cuenta/tienda-app',
      )
      const avisos = t
        .log()
        .split('\n')
        .filter((l) => l.includes('AVISO · GitHub: a la app'))
      expect(avisos).toHaveLength(1)
      expect(avisos[0]).toContain('Resource not accessible by integration')
    },
    TIEMPO,
  )

  it(
    'permiso_de_llamada traduce cada llamada al permiso que pide',
    () => {
      const casos: [string, string][] = [
        ['issue edit 5 --add-label x', 'issues: write'],
        ['api -X POST repos/{owner}/{repo}/issues/5/comments', 'issues: write'],
        ['api repos/{owner}/{repo}/labels', 'issues: write'],
        ['pr merge 9 --auto --squash', 'contents: write y pull_requests: write'],
        ['pr view 9', 'pull_requests: write'],
        ['api repos/{owner}/{repo}/pulls/9/files', 'pull_requests: write'],
        ['workflow run ci.yml', 'actions: write'],
        ['run rerun 4 --failed', 'actions: write'],
        ['api -X POST repos/{owner}/{repo}/actions/workflows/ci.yml/dispatches', 'actions: write'],
        ['api graphql -f query=x', 'merge_queues o pull_requests'],
        ['api -X POST repos/{owner}/{repo}/git/refs', 'contents: write'],
        ['api repos/{owner}/{repo}/contents/x', 'contents: write'],
        ['api rate_limit', 'el que pide ese pedido'],
      ]
      const t = conApp()
      const r = t.lineas(casos.map(([c]) => `permiso_de_llamada ${c}`).join('; '))
      expect(r.filter(Boolean)).toEqual(casos.map(([, p]) => p))
    },
    TIEMPO,
  )
})

describe('como-app.sh', () => {
  it(
    'rechaza lo que no es gh, git ni un guion de flujo, y corre gh con el token de la app',
    () => {
      const t = conApp()
      const r = t.funciones(
        'bash "$ORQ/como-app.sh" printenv; echo "rc=$?"; bash "$ORQ/como-app.sh" gh auth status; echo "rc=$?"; bash "$ORQ/como-app.sh" gh -R a/b auth token; echo "rc=$?"; bash "$ORQ/como-app.sh" gh api "repos/{owner}/{repo}/labels" --jq ".[].name"',
      )
      expect(r.salida).toMatch(/rc=64[\s\S]*rc=64[\s\S]*rc=64/)
      expect(r.salida).toContain('bug')
      expect(t.tokens()).toEqual([TOKEN])
    },
    TIEMPO,
  )
})
