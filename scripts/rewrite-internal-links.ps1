param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $root 'content'

function Normalize-Text([string]$value) {
    $value = [Uri]::UnescapeDataString($value).ToLowerInvariant()
    $value = [regex]::Replace($value, '\s*｜.*$', '')
    $value = $value -replace 'tiamru', 'timaru'
    $value = $value -replace 'projeck', 'project'
    $value = [regex]::Replace($value, '[^a-z0-9\p{L}\p{Nd}]+', '')
    return $value
}

function Get-CommonPrefixLength([string]$a, [string]$b) {
    $limit = [Math]::Min($a.Length, $b.Length)
    $i = 0
    while ($i -lt $limit -and $a[$i] -eq $b[$i]) { $i++ }
    return $i
}

$pages = foreach ($file in Get-ChildItem -LiteralPath $contentRoot -Recurse -File -Filter '*.md') {
    $text = [IO.File]::ReadAllText($file.FullName)
    $title = [regex]::Match($text, '(?m)^title:\s*["'']?(.*?)["'']?\s*$').Groups[1].Value
    $slug = [regex]::Match($text, '(?m)^slug:\s*["'']?(.*?)["'']?\s*$').Groups[1].Value
    $date = [regex]::Match($text, '(?m)^date:\s*(\d{4})-(\d{2})')
    if (-not $title -or -not $slug -or -not $date.Success) { continue }

    [PSCustomObject]@{
        File = $file.FullName
        RelativeFile = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
        Title = $title
        Folder = $file.Directory.Name
        Slug = $slug
        NewPath = "/posts/$($date.Groups[1].Value)/$($date.Groups[2].Value)/$slug/"
        TitleKey = Normalize-Text $title
        FolderKey = Normalize-Text $file.Directory.Name
    }
}

$linkPattern = '\[([^\]]*)\]\((https?://(?:www\.)?xainome\.blog/[^)\s]+)\)'
$occurrences = @()

foreach ($source in Get-ChildItem -LiteralPath $contentRoot -Recurse -File -Filter '*.md') {
    $text = [IO.File]::ReadAllText($source.FullName)
    foreach ($match in [regex]::Matches($text, $linkPattern, 'IgnoreCase')) {
        $url = $match.Groups[2].Value
        if ($url -match '/wp-(content|admin)/|[?&]p=\d+') { continue }
        if ($url -match '^https?://(?:www\.)?xainome\.blog/?$|/page/\d+/?$') { continue }

        $uri = [Uri]$url
        $oldSegment = $uri.AbsolutePath.Trim('/').Split('/')[-1]
        $oldKey = Normalize-Text $oldSegment
        if (-not $oldKey) { continue }

        $ranked = foreach ($page in $pages) {
            $folderPrefix = Get-CommonPrefixLength $oldKey $page.FolderKey
            $titlePrefix = Get-CommonPrefixLength $oldKey $page.TitleKey
            $contains = if (
                $oldKey -eq $page.FolderKey -or
                $oldKey -eq $page.TitleKey -or
                $page.TitleKey.StartsWith($oldKey) -or
                $oldKey.StartsWith($page.FolderKey)
            ) { 1000 } else { 0 }
            $score = $contains + [Math]::Max($folderPrefix, $titlePrefix)
            [PSCustomObject]@{ Page = $page; Score = $score }
        }
        $ranked = @($ranked | Sort-Object Score -Descending)
        $best = $ranked[0]
        $second = $ranked[1]
        $minimumPrefix = [Math]::Min(12, [Math]::Max(6, [int]($oldKey.Length * 0.35)))
        $resolved = $best.Score -ge $minimumPrefix -and ($best.Score -ge 1000 -or ($best.Score - $second.Score) -ge 3)

        $occurrences += [PSCustomObject]@{
            Source = $source.FullName
            SourceRelative = $source.FullName.Substring($root.Length + 1).Replace('\', '/')
            FullMatch = $match.Value
            Label = $match.Groups[1].Value
            OldUrl = $url
            OldKey = $oldKey
            Target = if ($resolved) { $best.Page } else { $null }
            Score = $best.Score
            SecondScore = $second.Score
            SuggestedTitle = $best.Page.Title
        }
    }
}

$resolvedItems = @($occurrences | Where-Object Target)
$unresolvedItems = @($occurrences | Where-Object { -not $_.Target })

if (-not $Apply) {
    Write-Output "TOTAL=$($occurrences.Count) RESOLVED=$($resolvedItems.Count) UNRESOLVED=$($unresolvedItems.Count)"
    Write-Output '=== UNRESOLVED ==='
    $unresolvedItems | Select-Object SourceRelative, OldUrl, SuggestedTitle, Score, SecondScore | Format-Table -Wrap
    Write-Output '=== SAMPLE RESOLVED ==='
    $resolvedItems | Select-Object -First 15 SourceRelative, OldUrl, @{N='Target';E={$_.Target.NewPath}} | Format-Table -Wrap
    exit 0
}

$bySource = $resolvedItems | Group-Object Source
foreach ($group in $bySource) {
    $text = [IO.File]::ReadAllText($group.Name)
    foreach ($item in $group.Group) {
        $replacement = "[$($item.Label)]($($item.Target.NewPath))"
        $text = $text.Replace($item.FullMatch, $replacement)
    }
    [IO.File]::WriteAllText($group.Name, $text, [Text.UTF8Encoding]::new($false))
}

Write-Output "UPDATED_LINKS=$($resolvedItems.Count) UPDATED_FILES=$($bySource.Count) SKIPPED=$($unresolvedItems.Count)"
