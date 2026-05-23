[CmdletBinding()]
param(
  [switch]$SkipTauriBuild,
  [switch]$SkipInnoCompile
)

$ErrorActionPreference = "Stop"

# Terminals ouverts avant rustup n'ont pas toujours %USERPROFILE%\.cargo\bin dans le PATH.
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
  $env:PATH = "$cargoBin;$env:PATH"
}

function Write-Step {
  param([string]$Message)
  Write-Host "[idols launcher Installer] $Message" -ForegroundColor Cyan
}

function Stop-LauncherProcesses {
  $stopped = @{}

  foreach ($name in @('idols launcher', 'idols_launcher')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | ForEach-Object {
      if ($stopped.ContainsKey($_.Id)) { return }
      Write-Step "Stopping $($_.ProcessName) (pid $($_.Id))"
      Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
      $stopped[$_.Id] = $true
    }
  }

  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ExecutablePath -and (
        $_.ExecutablePath -like '*\idols launcher.exe' -or
        $_.ExecutablePath -like '*\idols_launcher.exe'
      )
    } |
    ForEach-Object {
      if ($stopped.ContainsKey($_.ProcessId)) { return }
      Write-Step "Stopping locked process (pid $($_.ProcessId)): $($_.ExecutablePath)"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      $stopped[$_.ProcessId] = $true
    }

  if ($stopped.Count -gt 0) {
    Start-Sleep -Milliseconds 800
  }
}

function Remove-StageDir {
  param([string]$StageDir)

  if (-not (Test-Path $StageDir)) { return }

  Stop-LauncherProcesses

  for ($attempt = 1; $attempt -le 6; $attempt++) {
    try {
      Remove-Item $StageDir -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq 6) {
        throw @"
Cannot remove staging folder (file in use):
  $StageDir
Close idols launcher, Explorer windows on that folder, then rerun the build.
"@
      }
      Write-Step "Staging folder locked, retry $attempt/6..."
      Stop-LauncherProcesses
      Start-Sleep -Seconds 1
    }
  }
}

function Find-Iscc {
  $isccCommand = Get-Command iscc -ErrorAction SilentlyContinue
  if ($isccCommand) { return $isccCommand.Source }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
    (Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe")
  ) | Where-Object { Test-Path $_ }

  return @($candidates | Select-Object -First 1)
}

function Get-VcRedistPath {
  param([string]$ScriptDir)

  $repoCopy = Join-Path $ScriptDir "vc_redist.x64.exe"
  if (Test-Path $repoCopy) {
    return (Resolve-Path $repoCopy).Path
  }

  $cacheDir = Join-Path $env:TEMP "idols-launcher"
  New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
  $cacheCopy = Join-Path $cacheDir "vc_redist.x64.exe"
  if (-not (Test-Path $cacheCopy)) {
    $url = "https://aka.ms/vs/17/release/vc_redist.x64.exe"
    Write-Step "Downloading VC++ redistributable"
    Invoke-WebRequest -Uri $url -OutFile $cacheCopy
  }
  return (Resolve-Path $cacheCopy).Path
}

function Get-TauriVersion {
  param([string]$TauriConfPath)
  $json = Get-Content $TauriConfPath -Raw | ConvertFrom-Json
  return $json.package.version
}

function Stage-TauriRelease {
  param(
    [string]$CargoDir,
    [string]$StageDir
  )

  $srcExe = Join-Path $CargoDir "idols launcher.exe"
  if (-not (Test-Path $srcExe)) {
    $alt = Join-Path $CargoDir "idols_launcher.exe"
    if (Test-Path $alt) { $srcExe = $alt }
    else {
      throw "Missing idols launcher.exe in $CargoDir. Run: npm run tauri build"
    }
  }

  Remove-StageDir -StageDir $StageDir
  New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

  $destExe = Join-Path $StageDir "idols launcher.exe"
  Copy-Item $srcExe $destExe -Force
  $sizeMb = [math]::Round((Get-Item $destExe).Length / 1MB, 1)
  Write-Step "Staged: idols launcher.exe ($sizeMb MB)"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Resolve-Path (Join-Path $scriptDir "..")
$tauriDir = Join-Path $projectDir "src-tauri"
$cargoReleaseDir = Join-Path $tauriDir "target\release"
$releaseDir = Join-Path $projectDir "installer\release-staging"
$installerScript = Join-Path $scriptDir "idols-launcher.iss"
$distDir = Join-Path $projectDir "dist"
$setupIcon = Join-Path $tauriDir "icons\icon.ico"
$tauriConf = Join-Path $tauriDir "tauri.conf.json"
$updateNotes = Join-Path $projectDir "update-notes.md"

if (-not (Test-Path $installerScript)) {
  throw "Missing $installerScript"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found. Install Node.js first."
}

function Test-CargoExecutable {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  try {
    $null = & $Path --version 2>&1
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Ensure-Cargo {
  # rustup installe cargo.exe comme lien symbolique vers rustup.exe (taille 0 en apparence).
  $candidates = @(
    (Join-Path $cargoBin "cargo.exe")
  )
  if (Get-Command cargo -ErrorAction SilentlyContinue) {
    $candidates += (Get-Command cargo).Source
  }
  $toolchainCargo = Get-ChildItem (Join-Path $env:USERPROFILE ".rustup\toolchains") -Recurse -Filter "cargo.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 1MB } |
    Select-Object -First 1 -ExpandProperty FullName
  if ($toolchainCargo) { $candidates += $toolchainCargo }

  foreach ($path in $candidates | Select-Object -Unique) {
    if (Test-CargoExecutable $path) { return $path }
  }

  $rustupExe = Join-Path $cargoBin "rustup.exe"
  if (Test-Path $rustupExe) {
    Write-Step "Réparation des shims Rust (rustup default stable)..."
    & $rustupExe default stable 2>&1 | Out-Null
    $cargoExe = Join-Path $cargoBin "cargo.exe"
    if (Test-CargoExecutable $cargoExe) { return $cargoExe }
  }

  throw @"
Rust/cargo introuvable ou ne répond pas.
1) Installe : winget install Rustlang.Rustup
2) Rouvre le terminal, puis vérifie : cargo -V
Chemin attendu : $(Join-Path $cargoBin 'cargo.exe')
"@
}

if (-not $SkipTauriBuild) {
  $cargoPath = Ensure-Cargo
  Write-Step "Using cargo: $cargoPath"

  Stop-LauncherProcesses

  Write-Step "npm install"
  Push-Location $projectDir
  try { npm install } finally { Pop-Location }

  $prodEnv = Join-Path $projectDir ".env.production"
  if (-not (Test-Path $prodEnv)) {
    throw @"
Fichier manquant pour l’installateur joueurs :
  $prodEnv

Copie .env.production.example → .env.production
et mets l’URL Cloudflare (tunnel-url.txt) :
  VITE_IDOLS_API_URL=https://xxxx.trycloudflare.com
"@
  }

  $tunnelFile = Join-Path (Split-Path $projectDir -Parent) "backend_idols\tunnel-url.txt"
  if (Test-Path $tunnelFile) {
    $tunnelUrl = (Get-Content $tunnelFile -Raw).Trim()
    if ($tunnelUrl -match '^https?://') {
      Write-Step "Sync URL Cloudflare depuis tunnel-url.txt → .env.production"
      $lanIp = "192.168.1.16"
      try {
        $lanIp = (
          Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
          Where-Object { $_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -ne "WellKnown" } |
          Select-Object -First 1
        ).IPAddress
      } catch { }
      if (-not $lanIp) { $lanIp = "192.168.1.16" }
      @"
# Installateur joueurs distants — genere au build (tunnel-url.txt)
VITE_IDOLS_PLAYER_BUILD=true
VITE_IDOLS_API_URL=$tunnelUrl

VITE_DISCORD_REDIRECT_URI=idols.launcher://auth
"@ | Set-Content -Path $prodEnv -Encoding UTF8
    }
  }

  Write-Step "Build avec .env.production (serveur idols Cloudflare)"

  Write-Step "npm run tauri build (release)"
  Push-Location $projectDir
  try { npm run tauri build } finally { Pop-Location }
}

if (-not (Test-Path $cargoReleaseDir)) {
  throw "Cargo release folder not found: $cargoReleaseDir`nRun without -SkipTauriBuild or fix the Tauri build."
}

Stop-LauncherProcesses
Stage-TauriRelease -CargoDir $cargoReleaseDir -StageDir $releaseDir

if (Test-Path $updateNotes) {
  Copy-Item $updateNotes (Join-Path $releaseDir "update-notes.md") -Force
}

$version = Get-TauriVersion -TauriConfPath $tauriConf
Write-Step "Version: $version"

if ($SkipInnoCompile) {
  Write-Step "Release ready: $releaseDir"
  exit 0
}

$isccPath = Find-Iscc
if (-not $isccPath) {
  throw @"
Inno Setup 6 not found. Install from https://jrsoftware.org/isinfo.php
Then rerun: .\installer\build-installer.ps1
"@
}

New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$vcRedistPath = Get-VcRedistPath -ScriptDir $scriptDir
$outputBase = "idols launcher Setup-$version"

Write-Step "Compiling installer with ISCC"

$isccArgs = @(
  "/DMyAppVersion=$version",
  "/DSourceDir=$releaseDir",
  "/DExecutableName=idols launcher.exe",
  "/DOutputDir=$distDir",
  "/DOutputBaseFilename=$outputBase",
  "/DVcRedistPath=$vcRedistPath"
)
if (Test-Path $setupIcon) {
  $isccArgs += "/DSetupIconFile=$setupIcon"
}
$isccArgs += $installerScript

& $isccPath @isccArgs
if ($LASTEXITCODE -ne 0) { throw "ISCC failed: $LASTEXITCODE" }

$installerPath = Join-Path $distDir "$outputBase.exe"
Write-Step "Done: $installerPath"
