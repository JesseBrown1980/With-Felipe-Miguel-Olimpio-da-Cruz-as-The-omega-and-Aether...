[CmdletBinding()]
param(
  [string]$OutDir = "C:\Users\acer\Asolaria\reports",
  [string]$Tag = "system-white-glove-sweep",
  [int]$ProgramDuplicateLimit = 300,
  [int]$FileDuplicateGroupLimit = 200,
  [int]$MaxFilesPerRoot = 20000,
  [int]$InstalledProgramDuplicateLimit = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsElevated {
  try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Invoke-Safe {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Script,
    [Parameter()]
    $Default = $null
  )

  try {
    return & $Script
  } catch {
    return $Default
  }
}

function Split-PathEntries {
  param([string]$RawPath)
  if ([string]::IsNullOrWhiteSpace($RawPath)) {
    return @()
  }

  return $RawPath.Split(";") `
    | ForEach-Object { $_.Trim() } `
    | Where-Object { $_ -ne "" }
}

function Mask-SensitiveText {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $Text
  }

  $masked = $Text
  $patterns = @(
    '(?i)(-sharedtoken\s+)([^\s"''`]+)',
    '(?i)(-token\s+)([^\s"''`]+)',
    '(?i)(-apikey\s+)([^\s"''`]+)',
    '(?i)(password\s*[=:]\s*)([^\s"''`]+)',
    '(?i)(secret\s*[=:]\s*)([^\s"''`]+)'
  )

  foreach ($pattern in $patterns) {
    $masked = [regex]::Replace($masked, $pattern, '$1***')
  }

  return $masked
}

function Get-CookieStoreInventory {
  $rows = [System.Collections.Generic.List[object]]::new()
  $candidates = [System.Collections.Generic.List[object]]::new()

  $chromePattern = "C:\Users\acer\AppData\Local\Google\Chrome\User Data\*\Network\Cookies"
  $edgePattern = "C:\Users\acer\AppData\Local\Microsoft\Edge\User Data\*\Network\Cookies"
  $firefoxPattern = "C:\Users\acer\AppData\Roaming\Mozilla\Firefox\Profiles\*\cookies.sqlite"

  foreach ($item in @(Get-ChildItem -Path $chromePattern -File -ErrorAction SilentlyContinue)) {
    $candidates.Add($item)
  }
  foreach ($item in @(Get-ChildItem -Path $edgePattern -File -ErrorAction SilentlyContinue)) {
    $candidates.Add($item)
  }
  foreach ($item in @(Get-ChildItem -Path $firefoxPattern -File -ErrorAction SilentlyContinue)) {
    $candidates.Add($item)
  }

  $uniqueCandidates = @(
    $candidates |
      Sort-Object FullName -Unique
  )

  foreach ($file in $uniqueCandidates) {
    $provider = "Unknown"
    $profile = ""
    $path = [string]$file.FullName

    if ($path -match '(?i)\\Google\\Chrome\\User Data\\([^\\]+)\\Network\\Cookies$') {
      $provider = "Chrome"
      $profile = [string]$matches[1]
    } elseif ($path -match '(?i)\\Microsoft\\Edge\\User Data\\([^\\]+)\\Network\\Cookies$') {
      $provider = "Edge"
      $profile = [string]$matches[1]
    } elseif ($path -match '(?i)\\Mozilla\\Firefox\\Profiles\\([^\\]+)\\cookies\.sqlite$') {
      $provider = "Firefox"
      $profile = [string]$matches[1]
    }

    $rows.Add([pscustomobject]@{
        provider = $provider
        profile = $profile
        path = $path
        sizeBytes = [int64]$file.Length
        sizeMB = [math]::Round(([double]$file.Length / 1MB), 2)
        lastWriteTime = [string]$file.LastWriteTime
      })
  }

  return @($rows)
}

$tests = [System.Collections.Generic.List[object]]::new()
function Add-Test {
  param(
    [string]$Name,
    [ValidateSet("pass", "warn", "fail")]
    [string]$Status,
    [ValidateSet("low", "medium", "high")]
    [string]$Severity,
    [string]$Summary,
    $Data = $null
  )

  $tests.Add([pscustomobject]@{
      name = $Name
      status = $Status
      severity = $Severity
      summary = $Summary
      data = $Data
    })
}

$timestamp = Get-Date
$stamp = $timestamp.ToString("yyyyMMdd-HHmmss")
$null = New-Item -ItemType Directory -Path $OutDir -Force
$jsonPath = Join-Path $OutDir "$Tag-$stamp.json"
$mdPath = Join-Path $OutDir "$Tag-$stamp.md"

$isElevated = Test-IsElevated
$whoamiGroups = Invoke-Safe { whoami /groups } @()

$ntCurrent = Invoke-Safe { Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" } $null
$os = Invoke-Safe { Get-CimInstance Win32_OperatingSystem } $null
$cs = Invoke-Safe { Get-CimInstance Win32_ComputerSystem } $null
$cpu = Invoke-Safe { Get-CimInstance Win32_Processor | Select-Object -First 1 } $null
$cpuUsagePercent = Invoke-Safe {
  [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples[0].CookedValue, 1)
} 0

$totalMemGB = [math]::Round(([double](Invoke-Safe { $os.TotalVisibleMemorySize } 0) / 1MB), 2)
$freeMemGB = [math]::Round(([double](Invoke-Safe { $os.FreePhysicalMemory } 0) / 1MB), 2)
$usedMemGB = [math]::Round(($totalMemGB - $freeMemGB), 2)
$usedMemPct = if ($totalMemGB -gt 0) { [math]::Round((($usedMemGB / $totalMemGB) * 100), 1) } else { 0 }

$topCpuProcesses = Invoke-Safe {
  Get-Process |
    Sort-Object CPU -Descending |
    Select-Object -First 25 ProcessName, Id, CPU, PM, WS, StartTime
} @()

$topWorkingSetProcesses = Invoke-Safe {
  Get-Process |
    Sort-Object WS -Descending |
    Select-Object -First 25 ProcessName, Id, CPU, PM, WS, StartTime
} @()

$langList = Invoke-Safe { Get-WinUserLanguageList | ForEach-Object { $_.LanguageTag } } @()
$installedUiCulture = Invoke-Safe { [System.Globalization.CultureInfo]::InstalledUICulture.Name } ""
$currentUiCulture = Invoke-Safe { [System.Globalization.CultureInfo]::CurrentUICulture.Name } ""

$volumes = Invoke-Safe {
  Get-Volume | Select-Object DriveLetter, FileSystem, HealthStatus, Size, SizeRemaining
} @()

$logicalDisks = Invoke-Safe {
  Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, DriveType, FileSystem, VolumeName, Size, FreeSpace
} @()

$wsearch = Invoke-Safe { Get-Service -Name WSearch } $null
$searchDataPath = "C:\ProgramData\Microsoft\Search\Data"
$searchDataReadable = $false
$searchDataError = ""
try {
  Get-ChildItem -LiteralPath $searchDataPath -Force -ErrorAction Stop | Select-Object -First 1 | Out-Null
  $searchDataReadable = $true
} catch {
  $searchDataReadable = $false
  $searchDataError = $_.Exception.Message
}

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$machinePathEntries = Split-PathEntries -RawPath $machinePath
$userPathEntries = Split-PathEntries -RawPath $userPath
$allPathEntries = @($machinePathEntries + $userPathEntries)

$normalizedPathEntries = $allPathEntries |
  ForEach-Object { $_.TrimEnd("\").ToLowerInvariant() } |
  Where-Object { $_ -ne "" }
$duplicatePathEntries = $normalizedPathEntries | Group-Object | Where-Object { $_.Count -gt 1 } | Sort-Object Count -Descending

$pythonWhere = Invoke-Safe { & where.exe python 2>$null } @()
if ($pythonWhere -is [string]) { $pythonWhere = @($pythonWhere) }
$pythonWhere = @($pythonWhere | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
$pythonShimFirst = @($pythonWhere).Count -gt 0 -and $pythonWhere[0] -match '(?i)\\WindowsApps\\python\.exe$'
$windowsAppsPath = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps"
$windowsAppsNormalized = $windowsAppsPath.TrimEnd("\").ToLowerInvariant()
$windowsAppsInPath = @($normalizedPathEntries | Where-Object { $_ -eq $windowsAppsNormalized }).Count -gt 0
$pythonShimPath = Join-Path $windowsAppsPath "python.exe"
$pythonShimExists = Test-Path -LiteralPath $pythonShimPath
$windowsStorePackage = Invoke-Safe { Get-AppxPackage -Name Microsoft.WindowsStore -ErrorAction Stop } $null

$javaWhere = Invoke-Safe { & where.exe java 2>$null } @()
if ($javaWhere -is [string]) { $javaWhere = @($javaWhere) }
$javaWhere = @($javaWhere | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })

$javaHomeMachine = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
$javaHomeUser = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")

$startupCommands = Invoke-Safe {
  Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User
} @()

$startupBypass = @(
  $startupCommands |
    Where-Object { $_.Command -match '(?i)-ExecutionPolicy\s+Bypass' } |
    ForEach-Object {
      [pscustomobject]@{
        Name = $_.Name
        Location = $_.Location
        User = $_.User
        Command = Mask-SensitiveText -Text ([string]$_.Command)
      }
    }
)

$scheduledTasks = Invoke-Safe { Get-ScheduledTask } @()
$scheduledBypass = [System.Collections.Generic.List[object]]::new()
foreach ($task in $scheduledTasks) {
  $actions = @($task.Actions | ForEach-Object {
      $executeValue = ""
      $argumentsValue = ""
      if ($_.PSObject.Properties.Name -contains "Execute") {
        $executeValue = [string]$_.Execute
      } else {
        $executeValue = [string]$_
      }
      if ($_.PSObject.Properties.Name -contains "Arguments") {
        $argumentsValue = [string]$_.Arguments
      }
      $cmd = ($executeValue + " " + $argumentsValue).Trim()
      $cmd
    })
  foreach ($action in $actions) {
    if ($action -match '(?i)-ExecutionPolicy\s+Bypass') {
      $scheduledBypass.Add([pscustomobject]@{
          TaskName = $task.TaskName
          TaskPath = $task.TaskPath
          State = [string]$task.State
          Action = Mask-SensitiveText -Text $action
        })
    }
  }
}

$installedPrograms = Invoke-Safe {
  @(
    Get-ItemProperty `
      HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, `
      HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*, `
      HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* `
      -ErrorAction Stop |
      Where-Object { $_.DisplayName } |
      Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, InstallLocation, UninstallString
  )
} @()

$installedProgramDuplicateGroups = @(
  $installedPrograms |
    Group-Object DisplayName |
    Where-Object { $_.Count -gt 1 } |
    Sort-Object Count -Descending |
    Select-Object -First $InstalledProgramDuplicateLimit
)

$oktaProgramRows = @(
  $installedPrograms |
    Where-Object {
      [string]$_.DisplayName -match '(?i)okta' -or [string]$_.Publisher -match '(?i)okta'
    }
)
$itopProgramRows = @(
  $installedPrograms |
    Where-Object {
      [string]$_.DisplayName -match '(?i)itop' -or [string]$_.Publisher -match '(?i)itop'
    }
)

$oktaProcesses = Invoke-Safe {
  Get-Process | Where-Object {
    [string]$_.ProcessName -match '(?i)okta'
  } | Select-Object ProcessName, Id, Path, StartTime
} @()

$oktaServices = Invoke-Safe {
  Get-Service | Where-Object {
    [string]$_.Name -match '(?i)okta' -or [string]$_.DisplayName -match '(?i)okta'
  } | Select-Object Name, DisplayName, Status, StartType
} @()

$oktaTasks = Invoke-Safe {
  Get-ScheduledTask | Where-Object {
    [string]$_.TaskName -match '(?i)okta' -or [string]$_.TaskPath -match '(?i)okta'
  } | Select-Object TaskName, TaskPath, State
} @()

$oktaStartupRows = @(
  $startupCommands |
    Where-Object {
      [string]$_.Name -match '(?i)okta' -or [string]$_.Command -match '(?i)okta'
    } |
    Select-Object Name, Command, Location, User
)

$cookieStores = Get-CookieStoreInventory
$cookieStoresTotalSizeMB = [math]::Round((@($cookieStores | Measure-Object -Property sizeMB -Sum).Sum), 2)

$remoteControlNamePattern = '(?i)(anydesk|teamviewer|rustdesk|splashtop|screenconnect|zoho|vnc|chrome remote desktop)'
$remotePrograms = @(
  $installedPrograms |
    Where-Object { [string]$_.DisplayName -match $remoteControlNamePattern } |
    Select-Object DisplayName, DisplayVersion, Publisher
)
$remoteProcesses = Invoke-Safe {
  Get-Process |
    Where-Object { [string]$_.ProcessName -match '(?i)(anydesk|teamviewer|rustdesk|splashtop|screenconnect|remoting_host)' } |
    Select-Object ProcessName, Id, CPU, PM, WS, StartTime
} @()
$remoteStartupRows = @(
  $startupCommands |
    Where-Object { [string]$_.Name -match $remoteControlNamePattern -or [string]$_.Command -match $remoteControlNamePattern } |
    Select-Object Name, Command, Location, User
)

$roots = @("C:\", "D:\") | Where-Object { Test-Path $_ }
$rootFolders = foreach ($root in $roots) {
  Invoke-Safe {
    Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction Stop |
      Select-Object @{ Name = "Drive"; Expression = { $root.Substring(0, 1) } }, Name, FullName
  } @()
}
$rootDuplicateGroups = @(
  $rootFolders |
    Group-Object Name |
    Where-Object { $_.Count -gt 1 } |
    Sort-Object Count -Descending
)

$programRoots = @(
  "C:\Program Files",
  "C:\Program Files (x86)",
  "D:\Program Files",
  "D:\Program Files (x86)",
  "C:\Java",
  "D:\Java"
) | Where-Object { Test-Path $_ }

$programFolders = foreach ($root in $programRoots) {
  Invoke-Safe {
    Get-ChildItem -LiteralPath $root -Directory -ErrorAction Stop |
      Select-Object @{ Name = "Root"; Expression = { $root } }, Name, FullName
  } @()
}

$programDuplicateGroups = @(
  $programFolders |
    Group-Object Name |
    Where-Object { $_.Count -gt 1 } |
    Sort-Object Count -Descending |
    Select-Object -First $ProgramDuplicateLimit
)

$duplicateScanRoots = @(
  "C:\Users\acer\Desktop",
  "C:\Users\acer\Documents",
  "C:\Users\acer\Downloads",
  "D:\projects",
  "D:\interview",
  "D:\interview - resume"
) | Where-Object { Test-Path $_ }

$duplicateFileRows = [System.Collections.Generic.List[object]]::new()
$duplicateRootScanStats = [System.Collections.Generic.List[object]]::new()
foreach ($scanRoot in $duplicateScanRoots) {
  $files = @(
    Invoke-Safe {
      Get-ChildItem -LiteralPath $scanRoot -File -Recurse -Force -ErrorAction Stop |
        Select-Object -First $MaxFilesPerRoot
    } @()
  )

  $scanCount = @($files).Count
  $duplicateRootScanStats.Add([pscustomobject]@{
      root = $scanRoot
      filesScanned = $scanCount
      truncatedAtLimit = ($scanCount -ge $MaxFilesPerRoot)
    })

  foreach ($file in $files) {
    $drive = [string](Invoke-Safe { [string]$file.FullName.Substring(0, 1).ToUpperInvariant() } "")
    $duplicateFileRows.Add([pscustomobject]@{
        signature = ("{0}|{1}" -f [string]$file.Name.ToLowerInvariant(), [string]$file.Length)
        name = [string]$file.Name
        length = [int64]$file.Length
        extension = [string]$file.Extension.ToLowerInvariant()
        drive = $drive
        root = $scanRoot
        path = [string]$file.FullName
      })
  }
}

$crossDriveFileDuplicateGroups = @(
  $duplicateFileRows |
    Group-Object signature |
    Where-Object {
      $_.Count -gt 1 -and @($_.Group.drive | Select-Object -Unique).Count -gt 1
    } |
    Sort-Object Count -Descending |
    Select-Object -First $FileDuplicateGroupLimit
)

$reparsePoints = Invoke-Safe {
  Get-ChildItem -LiteralPath "C:\Users\acer" -Directory -Recurse -Depth 4 -Force -ErrorAction Stop |
    Where-Object { $_.LinkType } |
    Select-Object FullName, LinkType, Target
} @()

if ($isElevated) {
  Add-Test -Name "session_elevation" -Status "pass" -Severity "low" -Summary "Session is elevated; advanced integrity checks can run."
} else {
  Add-Test -Name "session_elevation" -Status "warn" -Severity "high" -Summary "Session is not elevated; SFC/DISM/BCD/CHKDSK diagnostics remain incomplete in this pass."
}

$buildNumber = [int](Invoke-Safe { [int]$ntCurrent.CurrentBuild } 0)
$productName = [string](Invoke-Safe { $ntCurrent.ProductName } "")
if ($productName -match "Windows 10 Home Single Language" -and $buildNumber -ge 22000) {
  Add-Test -Name "edition_build_mismatch" -Status "warn" -Severity "medium" -Summary "Edition metadata says Windows 10 Home Single Language while build number is Windows 11-class."
} else {
  Add-Test -Name "edition_build_mismatch" -Status "pass" -Severity "low" -Summary "Edition/build metadata appears internally consistent."
}

if ($wsearch -and $wsearch.Status -eq "Running") {
  Add-Test -Name "search_service" -Status "pass" -Severity "low" -Summary "Windows Search service is running."
} else {
  Add-Test -Name "search_service" -Status "warn" -Severity "medium" -Summary "Windows Search service is not running."
}

if ($searchDataReadable) {
  Add-Test -Name "search_index_access" -Status "pass" -Severity "low" -Summary "Search index path is readable from current token."
} else {
  Add-Test -Name "search_index_access" -Status "warn" -Severity "medium" -Summary "Search index path could not be read from current token." -Data $searchDataError
}

if ($pythonShimFirst -or @($pythonWhere).Count -gt 1) {
  Add-Test -Name "python_resolution_collision" -Status "warn" -Severity "high" -Summary "Multiple Python executables detected, with Microsoft Store shim taking precedence."
} else {
  Add-Test -Name "python_resolution_collision" -Status "pass" -Severity "low" -Summary "Python executable resolution appears clean."
}

if ($windowsStorePackage) {
  Add-Test -Name "microsoft_store_presence" -Status "pass" -Severity "low" -Summary "Microsoft Store package is present for this user."
} else {
  Add-Test -Name "microsoft_store_presence" -Status "warn" -Severity "high" -Summary "Microsoft Store package was not found for this user session."
}

if ($windowsAppsInPath -and $pythonShimExists) {
  Add-Test -Name "windowsapps_shim_integrity" -Status "pass" -Severity "low" -Summary "WindowsApps path and python shim are present."
} else {
  Add-Test -Name "windowsapps_shim_integrity" -Status "warn" -Severity "high" -Summary "WindowsApps path or python shim is missing."
}

if (-not [string]::IsNullOrWhiteSpace($javaHomeMachine) -and -not [string]::IsNullOrWhiteSpace($javaHomeUser) -and $javaHomeMachine -ne $javaHomeUser) {
  Add-Test -Name "java_home_collision" -Status "warn" -Severity "medium" -Summary "Machine and user JAVA_HOME values differ."
} else {
  Add-Test -Name "java_home_collision" -Status "pass" -Severity "low" -Summary "JAVA_HOME values are aligned or singular."
}

if ($usedMemPct -ge 85) {
  Add-Test -Name "memory_pressure" -Status "warn" -Severity "high" -Summary ("Physical memory usage is high ({0}%)." -f $usedMemPct)
} elseif ($usedMemPct -ge 70) {
  Add-Test -Name "memory_pressure" -Status "warn" -Severity "medium" -Summary ("Physical memory usage is moderate-high ({0}%)." -f $usedMemPct)
} else {
  Add-Test -Name "memory_pressure" -Status "pass" -Severity "low" -Summary ("Physical memory usage is stable ({0}%)." -f $usedMemPct)
}

if ($cpuUsagePercent -ge 85) {
  Add-Test -Name "cpu_pressure" -Status "warn" -Severity "high" -Summary ("Instant CPU load is high ({0}%)." -f $cpuUsagePercent)
} elseif ($cpuUsagePercent -ge 65) {
  Add-Test -Name "cpu_pressure" -Status "warn" -Severity "medium" -Summary ("Instant CPU load is elevated ({0}%)." -f $cpuUsagePercent)
} else {
  Add-Test -Name "cpu_pressure" -Status "pass" -Severity "low" -Summary ("Instant CPU load is normal ({0}%)." -f $cpuUsagePercent)
}

if (@($startupBypass).Count -gt 0) {
  Add-Test -Name "startup_bypass_usage" -Status "warn" -Severity "high" -Summary "Startup entries use PowerShell ExecutionPolicy Bypass." -Data ($startupBypass | Select-Object -First 20)
} else {
  Add-Test -Name "startup_bypass_usage" -Status "pass" -Severity "low" -Summary "No startup entries with ExecutionPolicy Bypass were found."
}

if (@($scheduledBypass).Count -gt 0) {
  Add-Test -Name "scheduled_task_bypass_usage" -Status "warn" -Severity "medium" -Summary "Scheduled tasks include ExecutionPolicy Bypass actions." -Data ($scheduledBypass | Select-Object -First 25)
} else {
  Add-Test -Name "scheduled_task_bypass_usage" -Status "pass" -Severity "low" -Summary "No scheduled task actions with ExecutionPolicy Bypass were found."
}

if (@($installedProgramDuplicateGroups).Count -gt 0) {
  Add-Test -Name "installed_program_duplicates" -Status "warn" -Severity "medium" -Summary "Installed program entries include duplicate display names." -Data ($installedProgramDuplicateGroups | Select-Object -First 60)
} else {
  Add-Test -Name "installed_program_duplicates" -Status "pass" -Severity "low" -Summary "Installed program display names do not contain duplicates."
}

$oktaArtifactCount = @($oktaProgramRows).Count + @($oktaProcesses).Count + @($oktaServices).Count + @($oktaTasks).Count + @($oktaStartupRows).Count
if ($oktaArtifactCount -gt 0) {
  Add-Test -Name "okta_artifacts" -Status "warn" -Severity "medium" -Summary "Okta-related artifacts remain present." -Data ([pscustomobject]@{
      programs = @($oktaProgramRows)
      processes = @($oktaProcesses)
      services = @($oktaServices)
      tasks = @($oktaTasks)
      startup = @($oktaStartupRows | ForEach-Object {
          [pscustomobject]@{
            Name = $_.Name
            Location = $_.Location
            User = $_.User
            Command = Mask-SensitiveText -Text ([string]$_.Command)
          }
        })
    })
} else {
  Add-Test -Name "okta_artifacts" -Status "pass" -Severity "low" -Summary "No Okta-related program/process/service/task/startup artifacts were found."
}

if (@($itopProgramRows).Count -gt 0) {
  Add-Test -Name "itop_artifacts" -Status "warn" -Severity "medium" -Summary "iTop-related installed program artifacts remain present." -Data ($itopProgramRows | Select-Object -First 20)
} else {
  Add-Test -Name "itop_artifacts" -Status "pass" -Severity "low" -Summary "No iTop installed program artifacts were found."
}

if (@($cookieStores).Count -ge 8 -or $cookieStoresTotalSizeMB -ge 25) {
  Add-Test -Name "cookie_store_sprawl" -Status "warn" -Severity "medium" -Summary ("Cookie stores are spread across many profiles or large in aggregate (stores={0}, totalMB={1})." -f @($cookieStores).Count, $cookieStoresTotalSizeMB) -Data ($cookieStores | Select-Object -First 30)
} elseif (@($cookieStores).Count -eq 0) {
  Add-Test -Name "cookie_store_sprawl" -Status "warn" -Severity "low" -Summary "No cookie stores were found in default profile locations."
} else {
  Add-Test -Name "cookie_store_sprawl" -Status "pass" -Severity "low" -Summary ("Cookie stores detected (stores={0}, totalMB={1})." -f @($cookieStores).Count, $cookieStoresTotalSizeMB)
}

$remoteSurfaceCount = @($remotePrograms).Count + @($remoteProcesses).Count + @($remoteStartupRows).Count
if ($remoteSurfaceCount -gt 0) {
  Add-Test -Name "remote_access_surface" -Status "warn" -Severity "medium" -Summary "Remote access/control software footprint is present." -Data ([pscustomobject]@{
      programs = @($remotePrograms)
      runningProcesses = @($remoteProcesses)
      startupEntries = @($remoteStartupRows | ForEach-Object {
          [pscustomobject]@{
            Name = $_.Name
            Location = $_.Location
            User = $_.User
            Command = Mask-SensitiveText -Text ([string]$_.Command)
          }
        })
    })
} else {
  Add-Test -Name "remote_access_surface" -Status "pass" -Severity "low" -Summary "No remote access/control footprint matched monitored patterns."
}

if (@($rootDuplicateGroups).Count -gt 0) {
  Add-Test -Name "cross_drive_root_duplicates" -Status "warn" -Severity "medium" -Summary "Matching top-level directory names exist on both C: and D:." -Data ($rootDuplicateGroups | Select-Object -First 40)
} else {
  Add-Test -Name "cross_drive_root_duplicates" -Status "pass" -Severity "low" -Summary "No duplicate top-level directory names detected across C: and D:."
}

if (@($programDuplicateGroups).Count -gt 0) {
  Add-Test -Name "program_folder_duplicates" -Status "warn" -Severity "medium" -Summary "Program folder names are duplicated across program roots." -Data ($programDuplicateGroups | Select-Object -First 60)
} else {
  Add-Test -Name "program_folder_duplicates" -Status "pass" -Severity "low" -Summary "No duplicated program folder names across scanned roots."
}

if (@($crossDriveFileDuplicateGroups).Count -gt 0) {
  Add-Test -Name "cross_drive_file_duplicates" -Status "warn" -Severity "medium" -Summary "Potential duplicate files (same name and size) detected across C: and D: scanned work roots." -Data ($crossDriveFileDuplicateGroups | Select-Object -First 60)
} else {
  Add-Test -Name "cross_drive_file_duplicates" -Status "pass" -Severity "low" -Summary "No cross-drive duplicate files (name+size) detected in scanned work roots."
}

if (@($duplicatePathEntries).Count -gt 0) {
  Add-Test -Name "path_duplicate_entries" -Status "warn" -Severity "medium" -Summary "PATH contains duplicate entries, which can cause ambiguous command resolution." -Data ($duplicatePathEntries | Select-Object -First 40)
} else {
  Add-Test -Name "path_duplicate_entries" -Status "pass" -Severity "low" -Summary "PATH entry list has no duplicates."
}

$report = [pscustomobject]@{
  generatedAt = $timestamp.ToString("o")
  host = [pscustomobject]@{
    computerName = $env:COMPUTERNAME
    user = "$env:USERDOMAIN\$env:USERNAME"
    isElevated = $isElevated
  }
  system = [pscustomobject]@{
    productName = $productName
    editionId = [string](Invoke-Safe { $ntCurrent.EditionID } "")
    displayVersion = [string](Invoke-Safe { $ntCurrent.DisplayVersion } "")
    currentBuild = [string](Invoke-Safe { $ntCurrent.CurrentBuild } "")
    ubr = [string](Invoke-Safe { $ntCurrent.UBR } "")
    osCaption = [string](Invoke-Safe { $os.Caption } "")
    osArchitecture = [string](Invoke-Safe { $os.OSArchitecture } "")
    installDate = [string](Invoke-Safe { $os.InstallDate } "")
    manufacturer = [string](Invoke-Safe { $cs.Manufacturer } "")
    model = [string](Invoke-Safe { $cs.Model } "")
    totalPhysicalMemoryGB = [math]::Round(([double](Invoke-Safe { $cs.TotalPhysicalMemory } 0) / 1GB), 2)
    cpu = [string](Invoke-Safe { $cpu.Name } "")
    logicalProcessors = [int](Invoke-Safe { $cpu.NumberOfLogicalProcessors } 0)
  }
  resources = [pscustomobject]@{
    memory = [pscustomobject]@{
      totalGB = $totalMemGB
      usedGB = $usedMemGB
      freeGB = $freeMemGB
      usedPercent = $usedMemPct
    }
    cpu = [pscustomobject]@{
      instantLoadPercent = $cpuUsagePercent
    }
    topCpuProcesses = @($topCpuProcesses | ForEach-Object {
        [pscustomobject]@{
          processName = [string]$_.ProcessName
          id = [int]$_.Id
          cpu = [double]$_.CPU
          pmMB = [math]::Round(([double]$_.PM / 1MB), 1)
          wsMB = [math]::Round(([double]$_.WS / 1MB), 1)
          startTime = [string]$_.StartTime
        }
      })
    topWorkingSetProcesses = @($topWorkingSetProcesses | ForEach-Object {
        [pscustomobject]@{
          processName = [string]$_.ProcessName
          id = [int]$_.Id
          cpu = [double]$_.CPU
          pmMB = [math]::Round(([double]$_.PM / 1MB), 1)
          wsMB = [math]::Round(([double]$_.WS / 1MB), 1)
          startTime = [string]$_.StartTime
        }
      })
  }
  language = [pscustomobject]@{
    userLanguageList = @($langList)
    installedUiCulture = $installedUiCulture
    currentUiCulture = $currentUiCulture
  }
  storage = [pscustomobject]@{
    volumes = @($volumes)
    logicalDisks = @($logicalDisks)
  }
  indexing = [pscustomobject]@{
    service = if ($wsearch) { [pscustomobject]@{ name = $wsearch.Name; status = [string]$wsearch.Status; startType = [string]$wsearch.StartType } } else { $null }
    dataPath = $searchDataPath
    dataPathReadable = $searchDataReadable
    dataPathAccessError = $searchDataError
  }
  runtimes = [pscustomobject]@{
    pythonWhere = @($pythonWhere)
    javaWhere = @($javaWhere)
    javaHomeMachine = $javaHomeMachine
    javaHomeUser = $javaHomeUser
    windowsAppsPath = $windowsAppsPath
    windowsAppsInPath = $windowsAppsInPath
    pythonShimPath = $pythonShimPath
    pythonShimExists = $pythonShimExists
    windowsStorePresent = [bool]$windowsStorePackage
  }
  programs = [pscustomobject]@{
    installedCount = @($installedPrograms).Count
    installedProgramDuplicates = @($installedProgramDuplicateGroups | ForEach-Object {
        [pscustomobject]@{
          name = [string]$_.Name
          count = [int]$_.Count
        }
      })
  }
  browser = [pscustomobject]@{
    cookieStores = @($cookieStores)
    cookieStoreCount = @($cookieStores).Count
    cookieStoreTotalSizeMB = $cookieStoresTotalSizeMB
  }
  securityFootprint = [pscustomobject]@{
    okta = [pscustomobject]@{
      installedPrograms = @($oktaProgramRows)
      processes = @($oktaProcesses)
      services = @($oktaServices)
      tasks = @($oktaTasks)
      startup = @($oktaStartupRows | ForEach-Object {
          [pscustomobject]@{
            Name = $_.Name
            Location = $_.Location
            User = $_.User
            Command = Mask-SensitiveText -Text ([string]$_.Command)
          }
        })
    }
    itop = [pscustomobject]@{
      installedPrograms = @($itopProgramRows)
    }
    remoteAccess = [pscustomobject]@{
      programs = @($remotePrograms)
      runningProcesses = @($remoteProcesses)
      startupEntries = @($remoteStartupRows | ForEach-Object {
          [pscustomobject]@{
            Name = $_.Name
            Location = $_.Location
            User = $_.User
            Command = Mask-SensitiveText -Text ([string]$_.Command)
          }
        })
    }
  }
  startup = [pscustomobject]@{
    startupBypass = @($startupBypass)
    scheduledBypass = @($scheduledBypass)
  }
  duplicates = [pscustomobject]@{
    rootDuplicates = @($rootDuplicateGroups | ForEach-Object {
        [pscustomobject]@{
          name = $_.Name
          count = $_.Count
          paths = @($_.Group.FullName)
        }
      })
    programDuplicates = @($programDuplicateGroups | ForEach-Object {
        [pscustomobject]@{
          name = $_.Name
          count = $_.Count
          paths = @($_.Group.FullName)
        }
      })
    duplicateFileScanRoots = @($duplicateRootScanStats)
    crossDriveFileDuplicates = @($crossDriveFileDuplicateGroups | ForEach-Object {
        $first = $_.Group | Select-Object -First 1
        [pscustomobject]@{
          signature = $_.Name
          name = $first.name
          length = $first.length
          count = $_.Count
          drives = @($_.Group.drive | Select-Object -Unique)
          paths = @($_.Group.path | Select-Object -First 10)
        }
      })
    reparsePoints = @($reparsePoints)
  }
  envPath = [pscustomobject]@{
    machineEntries = @($machinePathEntries)
    userEntries = @($userPathEntries)
    duplicateEntries = @($duplicatePathEntries | ForEach-Object {
        [pscustomobject]@{
          value = $_.Name
          count = $_.Count
        }
      })
  }
  identity = [pscustomobject]@{
    whoamiGroups = @($whoamiGroups)
  }
  tests = @($tests)
}

$json = $report | ConvertTo-Json -Depth 12
Set-Content -LiteralPath $jsonPath -Value $json -Encoding UTF8

$warnings = @($tests | Where-Object { $_.status -in @("warn", "fail") })
$passes = @($tests | Where-Object { $_.status -eq "pass" })

$md = [System.Collections.Generic.List[string]]::new()
$md.Add("# System White-Glove Sweep")
$md.Add("")
$md.Add("- Generated: $($timestamp.ToString("u"))")
$md.Add("- Host: $env:COMPUTERNAME")
$md.Add("- Elevated session: $isElevated")
$md.Add("- Report JSON: $jsonPath")
$md.Add("")
$md.Add("## Findings")
if (@($warnings).Count -eq 0) {
  $md.Add("- No warnings/failures in this read-only pass.")
} else {
  foreach ($finding in $warnings) {
    $md.Add("- [$($finding.status.ToUpper())][$($finding.severity)] $($finding.name): $($finding.summary)")
  }
}
$md.Add("")
$md.Add("## Quick Stats")
$md.Add("- Tests passed: $(@($passes).Count)")
$md.Add("- Tests warning/fail: $(@($warnings).Count)")
$md.Add("- Memory used: $usedMemGB GB / $totalMemGB GB ($usedMemPct%)")
$md.Add("- Instant CPU load: $cpuUsagePercent%")
$md.Add("- Root duplicate groups (C/D): $(@($rootDuplicateGroups).Count)")
$md.Add("- Program duplicate groups: $(@($programDuplicateGroups).Count)")
$md.Add("- Installed program duplicate names: $(@($installedProgramDuplicateGroups).Count)")
$md.Add("- Cross-drive duplicate file groups (name+size): $(@($crossDriveFileDuplicateGroups).Count)")
$md.Add("- Startup bypass entries: $(@($startupBypass).Count)")
$md.Add("- Scheduled-task bypass actions: $(@($scheduledBypass).Count)")
$md.Add("- PATH duplicate entries: $(@($duplicatePathEntries).Count)")
$md.Add("- Reparse points in C:\\Users\\acer (depth<=4): $(@($reparsePoints).Count)")
$md.Add("- Cookie stores found: $(@($cookieStores).Count) (total $cookieStoresTotalSizeMB MB)")
$md.Add("- Okta artifacts total: $oktaArtifactCount")
$md.Add("- iTop installed artifacts: $(@($itopProgramRows).Count)")
$md.Add("- Remote access surface rows: $remoteSurfaceCount")
$md.Add("")
$md.Add("## Next Diagnostic Gate")
if ($isElevated) {
  $md.Add("- Elevated checks can run immediately: sfc /verifyonly, dism /online /cleanup-image /scanhealth, bcdedit /enum, chkdsk /scan.")
} else {
  $md.Add("- Re-run this sweep in an elevated PowerShell session for integrity checks requiring admin token.")
}

Set-Content -LiteralPath $mdPath -Value ($md -join [Environment]::NewLine) -Encoding UTF8

[pscustomobject]@{
  ok = $true
  generatedAt = $timestamp.ToString("o")
  elevated = $isElevated
  jsonReport = $jsonPath
  markdownReport = $mdPath
  totalTests = @($tests).Count
  warningsOrFails = @($warnings).Count
  rootDuplicateGroups = @($rootDuplicateGroups).Count
  programDuplicateGroups = @($programDuplicateGroups).Count
  installedProgramDuplicateNames = @($installedProgramDuplicateGroups).Count
  crossDriveFileDuplicateGroups = @($crossDriveFileDuplicateGroups).Count
  startupBypassEntries = @($startupBypass).Count
  scheduledBypassActions = @($scheduledBypass).Count
  cookieStoreCount = @($cookieStores).Count
  oktaArtifacts = $oktaArtifactCount
  remoteSurfaceRows = $remoteSurfaceCount
  memoryUsedPercent = $usedMemPct
  cpuInstantPercent = $cpuUsagePercent
} | ConvertTo-Json -Depth 6
