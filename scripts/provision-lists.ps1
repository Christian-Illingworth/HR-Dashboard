<#
.SYNOPSIS
  Creates the HR Dashboard lists in the "HR Dashboard Data" site (research P6,
  specs/001-hr-dashboard/contracts/sharepoint-lists.md).

.DESCRIPTION
  FOR A HUMAN TO RUN, once, as a site owner of the data site. Claude never runs this
  (CLAUDE.md, Hard constraints). It is safe to re-run: existing lists and columns are left
  alone. It creates lists, columns, indexes and the seed items only. It does NOT grant any
  permission: the Sites.Selected grant for the Function's managed identity is printed at the
  end for an admin to do.

  Needs the PnP.PowerShell module (Install-Module PnP.PowerShell -Scope CurrentUser) and an
  Entra app registration that PnP can sign in with (-ClientId), as PnP PowerShell now requires.

.EXAMPLE
  ./scripts/provision-lists.ps1 -SiteUrl https://contoso.sharepoint.com/sites/hr-dashboard-data -ClientId <PnP app client ID>
#>
param(
  [Parameter(Mandatory)] [string] $SiteUrl,
  [Parameter(Mandatory)] [string] $ClientId
)

$ErrorActionPreference = 'Stop'
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive

# Column definitions, as in contracts/sharepoint-lists.md. Kind: Text, DateOnly, DateTime, Number,
# Boolean, Note (multiple lines, plain), Choice. Indexed columns keep filtered reads under the
# list view threshold.
$lists = [ordered]@{
  'HRD Employees' = @(
    @{ Name = 'StartDate'; Kind = 'DateOnly' }, @{ Name = 'EndDate'; Kind = 'DateOnly'; Indexed = $true },
    @{ Name = 'JobTitle'; Kind = 'Text' }, @{ Name = 'Department'; Kind = 'Text' },
    @{ Name = 'GivenName'; Kind = 'Text' }, @{ Name = 'FamilyName'; Kind = 'Text' }, @{ Name = 'ContentHash'; Kind = 'Text' }
  )
  'HRD Employee History' = @(
    @{ Name = 'EmployeeId'; Kind = 'Text'; Indexed = $true }, @{ Name = 'Month'; Kind = 'Text'; Indexed = $true },
    @{ Name = 'Department'; Kind = 'Text' }, @{ Name = 'JobTitle'; Kind = 'Text' }
  )
  'HRD Absences' = @(
    @{ Name = 'EmployeeId'; Kind = 'Text'; Indexed = $true }, @{ Name = 'BrightHrType'; Kind = 'Text' }, @{ Name = 'DisplayName'; Kind = 'Text' },
    @{ Name = 'StartDate'; Kind = 'DateOnly'; Indexed = $true }, @{ Name = 'StartPart'; Kind = 'Choice'; Choices = @('FullDay', 'FirstHalf', 'SecondHalf', 'Time') },
    @{ Name = 'EndDate'; Kind = 'DateOnly'; Indexed = $true }, @{ Name = 'EndPart'; Kind = 'Choice'; Choices = @('FullDay', 'FirstHalf', 'SecondHalf', 'Time') },
    @{ Name = 'DurationDays'; Kind = 'Number' }, @{ Name = 'DurationMinutes'; Kind = 'Number' },
    @{ Name = 'PregnancyRelated'; Kind = 'Boolean' }, @{ Name = 'ContentHash'; Kind = 'Text' }
  )
  'HRD Sickness Reasons' = @(
    @{ Name = 'Reason'; Kind = 'Note' }
  )
  'HRD Sync Status' = @(
    @{ Name = 'LastAttemptStartedAt'; Kind = 'DateTime' }, @{ Name = 'LastAttemptFinishedAt'; Kind = 'DateTime' },
    @{ Name = 'LastSuccessAt'; Kind = 'DateTime' }, @{ Name = 'RunningSince'; Kind = 'DateTime' }, @{ Name = 'LastManualRefreshAt'; Kind = 'DateTime' },
    @{ Name = 'LastAttemptOutcome'; Kind = 'Choice'; Choices = @('Running', 'Succeeded', 'Failed') },
    @{ Name = 'LastFailureCode'; Kind = 'Text' }, @{ Name = 'DataMode'; Kind = 'Choice'; Choices = @('Sample', 'Live') },
    @{ Name = 'HistoryStartDate'; Kind = 'DateOnly' }, @{ Name = 'Warnings'; Kind = 'Note' }
  )
  'HRD Settings' = @(
    @{ Name = 'Value'; Kind = 'Note' }
  )
}
# Title holds each list's key; these lists need it unique (and therefore indexed).
$uniqueTitle = @('HRD Employees', 'HRD Employee History', 'HRD Absences', 'HRD Sickness Reasons')

foreach ($listName in $lists.Keys) {
  $list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue
  if (-not $list) {
    Write-Host "Creating list $listName"
    $list = New-PnPList -Title $listName -Template GenericList -OnQuickLaunch:$false
  } else {
    Write-Host "List $listName exists; checking its columns"
  }
  # Versioning only on Settings, so old values (including sickness reasons) don't linger.
  Set-PnPList -Identity $listName -EnableVersioning ($listName -eq 'HRD Settings') | Out-Null

  if ($uniqueTitle -contains $listName) {
    Set-PnPField -List $listName -Identity 'Title' -Values @{ Indexed = $true; EnforceUniqueValues = $true } | Out-Null
  }

  foreach ($col in $lists[$listName]) {
    if (Get-PnPField -List $listName -Identity $col.Name -ErrorAction SilentlyContinue) { continue }
    Write-Host "  + $($col.Name) ($($col.Kind))"
    switch ($col.Kind) {
      'Text'     { Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type Text | Out-Null }
      'Number'   { Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type Number | Out-Null }
      'Boolean'  { Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type Boolean | Out-Null }
      'Choice'   { Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type Choice -Choices $col.Choices | Out-Null }
      'Note'     {
        Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type Note | Out-Null
        Set-PnPField -List $listName -Identity $col.Name -Values @{ RichText = $false; UnlimitedLengthInDocumentLibrary = $true } | Out-Null
      }
      'DateOnly' {
        Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type DateTime | Out-Null
        Set-PnPField -List $listName -Identity $col.Name -Values @{ DisplayFormat = 0 } | Out-Null
      }
      'DateTime' {
        Add-PnPField -List $listName -InternalName $col.Name -DisplayName $col.Name -Type DateTime | Out-Null
        Set-PnPField -List $listName -Identity $col.Name -Values @{ DisplayFormat = 1 } | Out-Null
      }
    }
    if ($col.Indexed) { Set-PnPField -List $listName -Identity $col.Name -Values @{ Indexed = $true } | Out-Null }
  }
}

# Seed items: default settings (data-model §2.6) and the single status item.
$settings = [ordered]@{ SalesDepartments = 'Sales'; AbsenceTypeMap = ''; PregnancyRelatedReasons = ''; StandardDayHours = '7.5' }
$existingSettings = @(Get-PnPListItem -List 'HRD Settings' | ForEach-Object { $_['Title'] })
foreach ($key in $settings.Keys) {
  if ($existingSettings -notcontains $key) {
    Add-PnPListItem -List 'HRD Settings' -Values @{ Title = $key; Value = $settings[$key] } | Out-Null
    Write-Host "Seeded setting $key"
  }
}
if (@(Get-PnPListItem -List 'HRD Sync Status').Count -eq 0) {
  Add-PnPListItem -List 'HRD Sync Status' -Values @{ Title = 'status'; DataMode = 'Sample'; Warnings = '{"departmentNotSet":0,"skippedRecords":0}' } | Out-Null
  Write-Host 'Seeded the status item'
}

$uri = [Uri]$SiteUrl
$graphSiteId = "$($uri.Host):$($uri.AbsolutePath.TrimEnd('/')):"
Write-Host ''
Write-Host 'Done. Lists are ready. Next, an admin (not this script) must:'
Write-Host '  1. Grant the Function app''s managed identity "write" on this site through Sites.Selected:'
Write-Host "     Grant-PnPAzureADAppSitePermission -AppId <managed identity app ID> -DisplayName 'HR Dashboard Function' -Site '$SiteUrl' -Permissions Write"
Write-Host "  2. Set the Function app setting DATA_SITE_ID to: $graphSiteId   (Graph's host:/path: site address)"
Write-Host '  3. Check the site permissions: site owners = the two named data administrators only (spec FR-028).'
