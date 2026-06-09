param(
  [switch]$IncludeDocCollab,
  [switch]$UsePackagedBackend,
  [int]$BackendPort = 8080,
  [int]$FrontendPort = 5173,
  [int]$DocCollabPort = 8091
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$docCollabDir = Join-Path $repoRoot "doc-collab"
$backendJar = Join-Path $backendDir "target\agenthub-backend-0.1.0-SNAPSHOT-exec.jar"
$backendApiBase = "http://127.0.0.1:$BackendPort"

function Start-CmdWindow($title, $command) {
  cmd.exe /c "start `"$title`" cmd.exe /k `"$command`""
}

if ($UsePackagedBackend -and -not (Test-Path $backendJar)) {
  throw "Packaged backend jar not found: $backendJar`nRun 'cd backend && mvn -q -DskipTests package' first, or omit -UsePackagedBackend."
}

$backendCommand = if ($UsePackagedBackend) {
  "cd /d `"$repoRoot`" && set SERVER_PORT=$BackendPort && java -jar `"$backendJar`""
} else {
  "cd /d `"$backendDir`" && set SERVER_PORT=$BackendPort && mvn spring-boot:run"
}

$frontendCommand = "cd /d `"$frontendDir`" && npm.cmd run dev -- --host 127.0.0.1 --port $FrontendPort"

Write-Output "Starting AgentHub backend on $backendApiBase"
Start-CmdWindow "AgentHub Backend" $backendCommand

Write-Output "Starting AgentHub frontend on http://127.0.0.1:$FrontendPort/workspace"
Start-CmdWindow "AgentHub Frontend" $frontendCommand

if ($IncludeDocCollab) {
  $docCollabCommand = "cd /d `"$docCollabDir`" && set DOC_COLLAB_PORT=$DocCollabPort && set AGENTHUB_API_BASE_URL=$backendApiBase && node dist/server.js"
  Write-Output "Starting doc-collab on ws://127.0.0.1:$DocCollabPort"
  Start-CmdWindow "AgentHub Doc Collab" $docCollabCommand
}

Write-Output ""
Write-Output "Backend:  $backendApiBase"
Write-Output "Frontend: http://127.0.0.1:$FrontendPort/workspace"
if ($IncludeDocCollab) {
  Write-Output "DocCollab: ws://127.0.0.1:$DocCollabPort"
}
