[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,

  [ValidateSet('Present', 'Absent')]
  [string]$State = 'Present',

  [string]$UpdateUrl = 'https://clients2.google.com/service/update2/crx',

  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$policyPath = 'HKCU:\Software\Policies\Google\Chrome\ExtensionInstallForcelist'

function Get-RegistryEntries {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }

  $item = Get-ItemProperty -LiteralPath $Path -ErrorAction Stop
  $reserved = @(
    'PSPath',
    'PSParentPath',
    'PSChildName',
    'PSDrive',
    'PSProvider'
  )

  $entries = @()
  foreach ($prop in $item.PSObject.Properties) {
    if ($reserved -contains [string]$prop.Name) {
      continue
    }
    $name = [string]$prop.Name
    $value = [string]$prop.Value
    if ([string]::IsNullOrWhiteSpace($name)) {
      continue
    }
    $parts = @($value -split ';', 2)
    $entries += [pscustomobject]@{
      Slot = $name
      Value = $value
      ExtensionId = if ($parts.Count -gt 0) { [string]$parts[0] } else { '' }
      UpdateUrl = if ($parts.Count -gt 1) { [string]$parts[1] } else { '' }
    }
  }

  return @(
    $entries | Sort-Object {
      $slotText = [string]$_.Slot
      $slotNumber = 0
      if ([int]::TryParse($slotText, [ref]$slotNumber)) {
        return $slotNumber
      }
      return [int]::MaxValue
    }, Slot
  )
}

function Get-NextSlotName {
  param([object[]]$Entries)

  $maxSlot = 0
  foreach ($entry in @($Entries)) {
    $slotNumber = 0
    if ([int]::TryParse([string]$entry.Slot, [ref]$slotNumber)) {
      if ($slotNumber -gt $maxSlot) {
        $maxSlot = $slotNumber
      }
    }
  }
  return [string]($maxSlot + 1)
}

function Build-Result {
  param(
    [string]$Action,
    [string]$Path,
    [string]$Id,
    [string]$DesiredValue,
    [object[]]$Entries
  )

  $chromeProcesses = @(Get-Process -Name chrome -ErrorAction SilentlyContinue)
  $matching = @($Entries | Where-Object {
      [string]::Equals([string]$_.ExtensionId, [string]$Id, [System.StringComparison]::OrdinalIgnoreCase)
    })

  return [pscustomobject]@{
    ok = $true
    action = $Action
    extensionId = $Id
    desiredValue = $DesiredValue
    policyPath = $Path
    matchingSlots = @($matching | ForEach-Object { [string]$_.Slot })
    chromeRunning = ($chromeProcesses.Count -gt 0)
    chromeProcessCount = $chromeProcesses.Count
    restartRecommended = ($chromeProcesses.Count -gt 0)
    entries = @($Entries | Select-Object Slot, ExtensionId, UpdateUrl, Value)
  }
}

if ($State -eq 'Present' -and [string]::IsNullOrWhiteSpace($UpdateUrl)) {
  throw 'UpdateUrl cannot be empty when State=Present.'
}

$desiredValue = if ($State -eq 'Present') {
  '{0};{1}' -f $ExtensionId.ToLowerInvariant(), $UpdateUrl.Trim()
} else {
  ''
}

if (-not (Test-Path -LiteralPath $policyPath)) {
  if ($State -eq 'Present') {
    if ($PSCmdlet.ShouldProcess($policyPath, 'Create Chrome ExtensionInstallForcelist key')) {
      New-Item -Path $policyPath -Force | Out-Null
    }
  }
}

$entries = @(Get-RegistryEntries -Path $policyPath)
$matches = @($entries | Where-Object {
    [string]::Equals([string]$_.ExtensionId, $ExtensionId, [System.StringComparison]::OrdinalIgnoreCase)
  })

$action = 'unchanged'

if ($State -eq 'Present') {
  if ($matches.Count -lt 1) {
    $slot = Get-NextSlotName -Entries $entries
    if ($PSCmdlet.ShouldProcess($policyPath, "Add Chrome managed extension $ExtensionId in slot $slot")) {
      New-ItemProperty -Path $policyPath -Name $slot -PropertyType String -Value $desiredValue -Force | Out-Null
    }
    $action = 'added'
  } else {
    $primary = @($matches | Sort-Object {
        $slotNumber = 0
        if ([int]::TryParse([string]$_.Slot, [ref]$slotNumber)) {
          return $slotNumber
        }
        return [int]::MaxValue
      }, Slot)[0]

    if (-not [string]::Equals([string]$primary.Value, $desiredValue, [System.StringComparison]::OrdinalIgnoreCase)) {
      if ($PSCmdlet.ShouldProcess($policyPath, "Update Chrome managed extension $ExtensionId in slot $($primary.Slot)")) {
        New-ItemProperty -Path $policyPath -Name ([string]$primary.Slot) -PropertyType String -Value $desiredValue -Force | Out-Null
      }
      $action = 'updated'
    } else {
      $action = 'already_present'
    }

    $duplicates = @($matches | Where-Object { [string]$_.Slot -ne [string]$primary.Slot })
    foreach ($entry in $duplicates) {
      if ($PSCmdlet.ShouldProcess($policyPath, "Remove duplicate Chrome managed extension entry $ExtensionId from slot $($entry.Slot)")) {
        Remove-ItemProperty -Path $policyPath -Name ([string]$entry.Slot) -ErrorAction SilentlyContinue
      }
    }
    if ($duplicates.Count -gt 0 -and $action -eq 'already_present') {
      $action = 'deduplicated'
    } elseif ($duplicates.Count -gt 0 -and $action -ne 'updated') {
      $action = 'updated'
    }
  }
} else {
  if ($matches.Count -gt 0) {
    foreach ($entry in $matches) {
      if ($PSCmdlet.ShouldProcess($policyPath, "Remove Chrome managed extension $ExtensionId from slot $($entry.Slot)")) {
        Remove-ItemProperty -Path $policyPath -Name ([string]$entry.Slot) -ErrorAction SilentlyContinue
      }
    }
    $action = 'removed'
  } else {
    $action = 'already_absent'
  }
}

$finalEntries = @(Get-RegistryEntries -Path $policyPath)
$result = Build-Result -Action $action -Path $policyPath -Id $ExtensionId.ToLowerInvariant() -DesiredValue $desiredValue -Entries $finalEntries

if ($Json.IsPresent) {
  $result | ConvertTo-Json -Depth 8
  return
}

$result
