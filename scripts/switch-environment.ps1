param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("local", "production")]
  [string]$Environment
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Copy-EnvironmentFile($ProjectPath) {
  $source = Join-Path $ProjectPath ".env.$Environment"
  $target = Join-Path $ProjectPath ".env"

  if (-not (Test-Path -LiteralPath $source)) {
    throw "No existe el archivo de ambiente: $source"
  }

  Copy-Item -LiteralPath $source -Destination $target -Force
}

function Read-EnvValue($Path, $Key) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
      continue
    }

    $index = $trimmed.IndexOf("=")
    $name = $trimmed.Substring(0, $index).Trim()
    if ($name -eq $Key) {
      return $trimmed.Substring($index + 1).Trim()
    }
  }

  return ""
}

function Set-MobileApiUrl() {
  $mobileEnv = Join-Path $Root "mobile\.env.$Environment"
  $apiFile = Join-Path $Root "mobile\src\config\api.ts"
  $publicApiBaseUrl = Read-EnvValue $mobileEnv "PUBLIC_API_BASE_URL"

  $content = Get-Content -LiteralPath $apiFile -Raw
  $escapedUrl = $publicApiBaseUrl.Replace("'", "\'")
  $updated = [regex]::Replace(
    $content,
    "const PUBLIC_API_BASE_URL = '.*?';",
    "const PUBLIC_API_BASE_URL = '$escapedUrl';"
  )

  if ($updated -eq $content -and $content -notmatch "const PUBLIC_API_BASE_URL = '") {
    throw "No se encontro PUBLIC_API_BASE_URL en $apiFile"
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($apiFile, $updated, $encoding)

  if ($Environment -eq "production" -and -not $publicApiBaseUrl) {
    Write-Warning "mobile/.env.production no tiene PUBLIC_API_BASE_URL. Agrega la URL publica del backend de Railway antes de compilar el APK de produccion."
  }
}

Copy-EnvironmentFile (Join-Path $Root "backend")
Copy-EnvironmentFile (Join-Path $Root "semantic-service")
Set-MobileApiUrl

Write-Host "Ambiente activo: $Environment"
Write-Host "backend/.env y semantic-service/.env fueron actualizados."
Write-Host "mobile/src/config/api.ts fue ajustado segun mobile/.env.$Environment."