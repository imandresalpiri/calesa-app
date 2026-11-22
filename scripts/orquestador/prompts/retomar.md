# Retomas una tarea a medias

{{MOTIVO_RETOMAR}}

Antes de escribir nada, mira qué quedó hecho en la rama: `git log --oneline origin/main..HEAD`, `git status --short` y `git diff --stat`,
y si ya hay PR, `gh pr view --json number,state,title,body`. No rehagas lo que ya está bien: sigue desde ahí hasta dejar la tarea
terminada y publicada según lo de abajo. Si hay cambios sin commitear que no sabes de dónde salen, revísalos: si sirven, commitéalos;
si no, déjalos fuera con `git stash` y dilo en el PR. La verificación entera es `bash scripts/flujo/verificar.sh`, una vez al final y en
segundo plano: si el árbol ya pasó, no corre nada.

**Esperar no es sondear:** lo largo (`verificar.sh`, `e2e-afectados.mjs --correr`, `db:probar`) se lanza con `run_in_background` y se espera su aviso; no leas el log hasta que llegue, no armes bucles de espera ni un Monitor de intervalo, y tras tu `RESULTADO` no rearmes esperas. El hook `PreToolUse` rechaza un Bash en primer plano que sondea y un Monitor que sólo cuenta tiempo.

## Respuesta de la persona

{{RESPUESTA}}
