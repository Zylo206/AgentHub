param(
  [switch]$IncludeDocCollab,
  [switch]$UsePackagedBackend,
  [ValidateSet("memory", "jdbc")]
  [string]$PersistenceMode = "memory",
  [string]$JdbcUrl,
  [string]$JdbcUsername,
  [string]$JdbcPassword,
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

function Get-CmdSetExpression($name, $value) {
  if ([string]::IsNullOrEmpty($value)) {
    return $null
  }
  return "set `"$name=$value`""
}

if ($UsePackagedBackend -and -not (Test-Path $backendJar)) {
  throw "Packaged backend jar not found: $backendJar`nRun 'cd backend && mvn -q -DskipTests package' first, or omit -UsePackagedBackend."
}

$resolvedJdbcUrl = if ($JdbcUrl) { $JdbcUrl } else { $env:AGENTHUB_JDBC_URL }
$resolvedJdbcUsername = if ($JdbcUsername) { $JdbcUsername } else { $env:AGENTHUB_JDBC_USERNAME }
$resolvedJdbcPassword = if ($PSBoundParameters.ContainsKey("JdbcPassword")) { $JdbcPassword } else { $env:AGENTHUB_JDBC_PASSWORD }

if ($PersistenceMode -eq "jdbc") {
  if ([string]::IsNullOrWhiteSpace($resolvedJdbcUrl)) {
    throw "JdbcUrl is required when -PersistenceMode jdbc is used. Pass -JdbcUrl or set AGENTHUB_JDBC_URL first."
  }
  if ([string]::IsNullOrWhiteSpace($resolvedJdbcUsername)) {
    throw "JdbcUsername is required when -PersistenceMode jdbc is used. Pass -JdbcUsername or set AGENTHUB_JDBC_USERNAME first."
  }
}

$backendEnvironment = @(
  (Get-CmdSetExpression "SERVER_PORT" $BackendPort),
  (Get-CmdSetExpression "AGENTHUB_PERSISTENCE_MODE" $PersistenceMode)
)

if ($PersistenceMode -eq "jdbc") {
  $backendEnvironment += @(
    (Get-CmdSetExpression "AGENTHUB_JDBC_URL" $resolvedJdbcUrl),
    (Get-CmdSetExpression "AGENTHUB_JDBC_USERNAME" $resolvedJdbcUsername),
    (Get-CmdSetExpression "AGENTHUB_JDBC_PASSWORD" $resolvedJdbcPassword)
  )
}

$backendEnvironmentCommand = [string]::Join(" && ", ($backendEnvironment | Where-Object { $_ }))

$backendCommand = if ($UsePackagedBackend) {
  "cd /d `"$repoRoot`" && $backendEnvironmentCommand && java -jar `"$backendJar`""
} else {
  "cd /d `"$backendDir`" && $backendEnvironmentCommand && mvn spring-boot:run"
}

$frontendCommand = "cd /d `"$frontendDir`" && npm.cmd run dev -- --host 127.0.0.1 --port $FrontendPort"

Write-Output "Starting AgentHub backend on $backendApiBase"
Write-Output "Persistence mode: $PersistenceMode"
if ($PersistenceMode -eq "jdbc") {
  Write-Output "JDBC URL: $resolvedJdbcUrl"
  Write-Output "JDBC user: $resolvedJdbcUsername"
}
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
