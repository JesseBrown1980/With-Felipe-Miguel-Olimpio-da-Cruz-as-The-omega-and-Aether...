[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:4781",
  [string]$OutDir = "",
  [int]$HintsLimit = 24,
  [int]$GetTimeoutSec = 90,
  [int]$PostTimeoutSec = 120,
  [switch]$UpdateLatest = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-JsonGet {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 30
  )
  return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec $TimeoutSec
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body = @{},
    [int]$TimeoutSec = 30
  )
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
}

function Get-PropValue {
  param(
    [object]$Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) { return $Default }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) { return $Object[$Name] }
    return $Default
  }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $Default }
  return $prop.Value
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = if ($OutDir) { $OutDir } else { Join-Path $repoRoot "reports" }
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$base = $BaseUrl.TrimEnd("/")

$indexResp = Invoke-JsonPost -Url ("{0}/api/skills/index/rebuild" -f $base) -Body @{} -TimeoutSec $PostTimeoutSec
$hintsResp = Invoke-JsonGet -Url ("{0}/api/mistakes/hints?status=active&limit={1}" -f $base, [Math]::Max(1, $HintsLimit)) -TimeoutSec $GetTimeoutSec
$mistakesResp = Invoke-JsonGet -Url ("{0}/api/mistakes/patterns?status=active&limit=300" -f $base) -TimeoutSec $GetTimeoutSec

$index = $indexResp.index
$skills = @()
if ($index.skills.items -is [System.Collections.IEnumerable]) {
  $skills = @($index.skills.items)
}
$actions = @()
if ($index.tools.actions -is [System.Collections.IEnumerable]) {
  $actions = @($index.tools.actions)
}
$mistakePatterns = @()
if ($mistakesResp.patterns -is [System.Collections.IEnumerable]) {
  $mistakePatterns = @($mistakesResp.patterns)
}
$indexMistakes = Get-PropValue -Object $index -Name "mistakes" -Default $null
$indexMistakeSummary = Get-PropValue -Object $indexMistakes -Name "summary" -Default $null
$hintsSummary = Get-PropValue -Object $hintsResp -Name "summary" -Default $null
$mistakeSummary = if ($indexMistakeSummary) {
  $indexMistakeSummary
} elseif ($hintsSummary) {
  $hintsSummary
} else {
  [ordered]@{
    updatedAt = ""
    counts = [ordered]@{
      total = 0
      active = 0
      archived = 0
      obsolete = 0
    }
  }
}
$mistakeLinks = Get-PropValue -Object $indexMistakes -Name "links" -Default ([ordered]@{
  bySkill = @{}
  byTool = @{}
  byActivity = @{}
})

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $base
  indexPath = [string]$indexResp.path
  skills = [ordered]@{
    total = [int]$index.skills.total
    errors = @($index.skills.errors).Count
    ids = @($skills | ForEach-Object { [string]$_.id })
  }
  tools = [ordered]@{
    totalActions = [int]$index.tools.totalActions
    actionIds = @($actions | ForEach-Object { [string]$_.action })
  }
  mistakes = [ordered]@{
    summary = $mistakeSummary
    activePatternCount = $mistakePatterns.Count
    topHints = @($hintsResp.hints | Select-Object -First ([Math]::Max(1, $HintsLimit)) | ForEach-Object {
      [ordered]@{
        id = [string]$_.id
        code = [string]$_.code
        severity = [string]$_.sev
        uses = [int]$_.uses
      }
    })
    links = $mistakeLinks
  }
  codexSkills = [ordered]@{
    total = [int]$index.codexSkills.total
    wrapperTotal = [int]$index.codexSkills.wrapperTotal
    nativeMatchTotal = [int]$index.codexSkills.nativeMatchTotal
    riskCounts = $index.codexSkills.riskCounts
  }
  mcp = $index.mcp
}

$jsonPath = Join-Path $reportsDir ("skills-tools-mistakes-index-{0}.json" -f $stamp)
$mdPath = Join-Path $reportsDir ("skills-tools-mistakes-index-{0}.md" -f $stamp)
$latestJson = Join-Path $reportsDir "skills-tools-mistakes-index-latest.json"
$latestMd = Join-Path $reportsDir "skills-tools-mistakes-index-latest.md"

$summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Skills + Tools + Mistakes Index")
$md.Add("")
$md.Add("- Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
$md.Add("- Runtime: " + $base)
$md.Add("- Index source path: " + [string]$indexResp.path)
$md.Add("")
$md.Add("## Skills")
$md.Add("- total: " + [string]$summary.skills.total)
$md.Add("- errors: " + [string]$summary.skills.errors)
$md.Add("")
$md.Add("## Tools")
$md.Add("- totalActions: " + [string]$summary.tools.totalActions)
$md.Add("")
$md.Add("## Mistakes")
$md.Add("- total: " + [string]($summary.mistakes.summary.counts.total))
$md.Add("- active: " + [string]($summary.mistakes.summary.counts.active))
$md.Add("- archived: " + [string]($summary.mistakes.summary.counts.archived))
$md.Add("- obsolete: " + [string]($summary.mistakes.summary.counts.obsolete))
$md.Add("- activePatternCount(list endpoint): " + [string]$summary.mistakes.activePatternCount)
$md.Add("")
$md.Add("### Top Hints")
foreach ($hint in @($summary.mistakes.topHints)) {
  $md.Add("- " + [string]$hint.code + " | " + [string]$hint.id + " | sev=" + [string]$hint.severity + " | uses=" + [string]$hint.uses)
}
$md.Add("")
$md.Add("## Codex Skills")
$md.Add("- total: " + [string]$summary.codexSkills.total)
$md.Add("- wrapperTotal: " + [string]$summary.codexSkills.wrapperTotal)
$md.Add("- nativeMatchTotal: " + [string]$summary.codexSkills.nativeMatchTotal)
$md.Add("")
$md.Add("## Artifacts")
$md.Add("- " + $jsonPath)
$md.Add("- " + $mdPath)
if ($UpdateLatest) {
  $md.Add("- " + $latestJson)
  $md.Add("- " + $latestMd)
}

Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ($md -join "`r`n")
if ($UpdateLatest) {
  Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force
  Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force
}

[pscustomobject]@{
  ok = $true
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $base
  jsonPath = $jsonPath
  markdownPath = $mdPath
  latestJson = if ($UpdateLatest) { $latestJson } else { "" }
  latestMarkdown = if ($UpdateLatest) { $latestMd } else { "" }
  skillCount = [int]$summary.skills.total
  toolActionCount = [int]$summary.tools.totalActions
  mistakeCount = [int]($summary.mistakes.summary.counts.total)
} | ConvertTo-Json -Depth 8
