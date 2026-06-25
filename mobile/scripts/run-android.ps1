param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ReactNativeArgs
)

$ErrorActionPreference = 'Stop'

function Use-ShortProjectPathIfNeeded {
  param(
    [string[]] $ArgsToForward
  )

  if ($env:ASOCIACION_SHORT_PATH_ACTIVE -eq '1') {
    return
  }

  $scriptDir = Split-Path -Parent $PSCommandPath
  $mobileRoot = Split-Path -Parent $scriptDir

  if ($mobileRoot.Length -lt 70) {
    return
  }

  $mirrorRoot = 'C:\tmp\asociacion-app-mobile-build'
  $mirrorScript = Join-Path $mirrorRoot 'scripts\run-android.ps1'
  $excludeDirs = @(
    (Join-Path $mobileRoot 'android\.gradle'),
    (Join-Path $mobileRoot 'android\build'),
    (Join-Path $mobileRoot 'android\app\build'),
    (Join-Path $mobileRoot 'android\app\.cxx'),
    (Join-Path $mobileRoot 'node_modules\react-native-reanimated\android\.cxx'),
    (Join-Path $mobileRoot 'node_modules\react-native-worklets\android\.cxx')
  )

  Write-Host "Mirroring mobile project to $mirrorRoot to avoid Android CMake/Ninja path length errors."
  New-Item -ItemType Directory -Force -Path $mirrorRoot | Out-Null

  $robocopyArgs = @(
    $mobileRoot,
    $mirrorRoot,
    '/MIR',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NP',
    '/R:1',
    '/W:1',
    '/XD'
  ) + $excludeDirs

  & robocopy.exe @robocopyArgs | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Could not mirror mobile project to $mirrorRoot. Robocopy exit code: $LASTEXITCODE"
  }

  if (-not (Test-Path -LiteralPath $mirrorScript)) {
    throw "Mirrored Android runner was not found at $mirrorScript"
  }

  $env:ASOCIACION_SHORT_PATH_ACTIVE = '1'
  $env:ASOCIACION_SOURCE_MOBILE_ROOT = $mobileRoot

  & powershell.exe -ExecutionPolicy Bypass -File $mirrorScript @ArgsToForward
  exit $LASTEXITCODE
}

Use-ShortProjectPathIfNeeded -ArgsToForward $ReactNativeArgs

$scriptDir = Split-Path -Parent $PSCommandPath
$mobileRoot = Split-Path -Parent $scriptDir
Set-Location -LiteralPath $mobileRoot

$jdk17 = 'C:\Users\cusmej\Documents\java\jdk\jdk-17'
$sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$androidUserHome = 'C:\Users\cusmej\.android'
$androidAvdHome = Join-Path $androidUserHome 'avd'
$avdName = 'Pixel_6_API_36'

$env:JAVA_HOME = $jdk17
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_USER_HOME = $androidUserHome
$env:ANDROID_AVD_HOME = $androidAvdHome
$env:Path = "$jdk17\bin;$sdkRoot\platform-tools;$sdkRoot\emulator;$sdkRoot\cmdline-tools\latest\bin;$env:Path"

$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $sdkRoot 'emulator\emulator.exe'

if (-not (Test-Path -LiteralPath (Join-Path $jdk17 'bin\java.exe'))) {
  throw "Java 17 was not found at $jdk17"
}

if (-not (Test-Path -LiteralPath $adb)) {
  throw "adb was not found at $adb"
}

if (-not (Test-Path -LiteralPath $emulator)) {
  throw "Android emulator was not found at $emulator"
}

function Get-OnlineAndroidDevice {
  $lines = & $adb devices | Select-Object -Skip 1
  return $lines | Where-Object { $_ -match '\sdevice$' } | Select-Object -First 1
}

function Wait-ForAndroidBoot {
  $deadline = (Get-Date).AddMinutes(8)

  & $adb wait-for-device

  do {
    Start-Sleep -Seconds 5
    $bootCompleted = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
    Write-Host "Android boot status: $bootCompleted"
  } while ($bootCompleted -ne '1' -and (Get-Date) -lt $deadline)

  if ($bootCompleted -ne '1') {
    throw 'The Android emulator did not finish booting in time.'
  }
}

& $adb start-server | Out-Null

$onlineDevice = Get-OnlineAndroidDevice

if (-not $onlineDevice) {
  $runningEmulator = Get-Process -Name 'emulator', 'qemu-system-x86_64' -ErrorAction SilentlyContinue

  if ($runningEmulator) {
    Write-Host 'An emulator process is already running. Waiting for Android to finish booting...'
  } else {
    $availableAvds = & $emulator -list-avds
    if ($availableAvds -notcontains $avdName) {
      throw "AVD $avdName was not found. Available AVDs: $($availableAvds -join ', ')"
    }

    Write-Host "Starting emulator $avdName..."
    Start-Process -FilePath $emulator -ArgumentList @('-avd', $avdName, '-gpu', 'swiftshader_indirect')
  }

  Wait-ForAndroidBoot
} else {
  Write-Host "Android device detected: $onlineDevice"
}

$defaultReactNativeArgs = @()
if ($ReactNativeArgs -notcontains '--active-arch-only') {
  $defaultReactNativeArgs += '--active-arch-only'
}

$argsForReactNative = @('react-native', 'run-android') + $defaultReactNativeArgs + $ReactNativeArgs
& npx.cmd @argsForReactNative
exit $LASTEXITCODE
