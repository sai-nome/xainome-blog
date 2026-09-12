param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $root 'content'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function ConvertFrom-YamlScalar {
    param([string]$Value)

    $value = $Value.Trim()
    if ($value.Length -ge 2 -and $value[0] -eq '"' -and $value[$value.Length - 1] -eq '"') {
        $value = $value.Substring(1, $value.Length - 2)
        $value = $value.Replace('\"', '"').Replace('\\', '\')
    }
    elseif ($value.Length -ge 2 -and $value[0] -eq "'" -and $value[$value.Length - 1] -eq "'") {
        $value = $value.Substring(1, $value.Length - 2).Replace("''", "'")
    }
    return $value
}

function Get-CleanTitle {
    param([string]$Title)

    $clean = [regex]::Replace($Title, '\s*｜.*$', '')
    $clean = $clean.Trim([char[]]' 【】「」')
    $clean = [regex]::Replace($clean, '\s+', ' ')
    return $clean.Trim()
}

function Get-CleanBodyText {
    param([string]$Body)

    $text = [regex]::Replace($Body, '<!--.*?-->', ' ', 'Singleline')
    $text = [regex]::Replace($text, '```.*?```', ' ', 'Singleline')
    $text = [regex]::Replace($text, '\{\{[<%].*?[>%]\}\}', ' ', 'Singleline')
    $text = [regex]::Replace($text, '!\[[^\]]*\]\([^\)]*\)', ' ')
    $text = [regex]::Replace($text, '\[([^\]]+)\]\([^\)]*\)', '$1')
    $text = [regex]::Replace($text, '(?m)^\s*\[[^\]]+(?:\s+[^\]]+)?\]\s*$', ' ')
    $text = [regex]::Replace($text, '<[^>]+>', ' ')
    $text = [regex]::Replace($text, '(?m)^\s*#{1,6}\s+.*$', ' ')
    $text = [regex]::Replace($text, '(?m)^\s*\|.*\|\s*$', ' ')
    $text = [regex]::Replace($text, '(?m)^\s*[-*_]{3,}\s*$', ' ')
    $text = [regex]::Replace($text, '(?m)^\s*(?:[-*+] |\d+[.)] )', '')
    $text = $text.Replace('**', '').Replace('__', '').Replace('`', '')
    $text = [regex]::Replace($text, 'https?://\S+', ' ')
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    $text = [regex]::Replace($text, '\s+', ' ')
    return $text.Trim()
}

function Limit-Description {
    param(
        [string]$Text,
        [int]$MaximumLength = 120
    )

    if ($Text.Length -le $MaximumLength) {
        return $Text
    }

    $candidate = $Text.Substring(0, $MaximumLength - 1).Trim()
    $lastStop = [Math]::Max(
        [Math]::Max($candidate.LastIndexOf('。'), $candidate.LastIndexOf('！')),
        $candidate.LastIndexOf('？')
    )
    if ($lastStop -ge 70) {
        return $candidate.Substring(0, $lastStop + 1)
    }

    $lastSpace = $candidate.LastIndexOf(' ')
    if ($lastSpace -ge 85) {
        $candidate = $candidate.Substring(0, $lastSpace)
    }
    return "$($candidate.Trim(' ', '、', '。'))…"
}

function New-SeoDescription {
    param(
        [string]$Title,
        [string]$Body,
        [string]$RelativePath
    )

    $cleanTitle = Get-CleanTitle $Title

    if ($cleanTitle -match 'プライバシーポリシー') {
        return 'サイノメのブログにおける個人情報の取り扱い、アクセス解析、広告、免責事項、著作権などの方針を掲載しています。'
    }
    if ($cleanTitle -match 'プロフィール|自己紹介') {
        return 'サイノメのプロフィールページです。これまでの経歴、IT・ゲーム・旅行などブログで発信しているテーマについて紹介します。'
    }
    if ($cleanTitle -match 'お問い合わせ') {
        return 'サイノメへのお問い合わせページです。ブログの記事や掲載内容に関するご連絡はこちらからお願いします。'
    }
    if ($cleanTitle -match '記事一覧|サイトマップ') {
        return 'サイノメに掲載している記事の一覧です。IT、ゲーム、旅行、英語学習、ニュージーランド生活などの記事を探せます。'
    }
    if ($RelativePath -like 'custom/*') {
        return 'サイノメへのお問い合わせに使用するフォームです。ブログの記事や掲載内容に関するご連絡を受け付けています。'
    }

    $cleanBody = Get-CleanBodyText $Body
    $cleanBody = [regex]::Replace(
        $cleanBody,
        '^(?:こんにちは|こんばんは|おはようございます|どうも)[！!。、,\s]*',
        ''
    )
    $cleanBody = [regex]::Replace($cleanBody, '^前回の続きになります[。！!\s]*', '')

    if ([string]::IsNullOrWhiteSpace($cleanBody)) {
        return Limit-Description "$cleanTitle。この記事の内容やポイントを、実際の経験を交えながら分かりやすく紹介します。"
    }

    if ($cleanBody.StartsWith($cleanTitle, [System.StringComparison]::OrdinalIgnoreCase)) {
        $description = $cleanBody
    }
    else {
        $separator = if ($cleanTitle -match '[。！!?？]$') { '' } else { '。' }
        $description = "$cleanTitle$separator$cleanBody"
    }

    return Limit-Description $description
}

function ConvertTo-YamlDoubleQuoted {
    param([string]$Value)

    $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
    return '"' + $escaped + '"'
}

$changed = 0
$skipped = 0
$preview = New-Object System.Collections.Generic.List[string]

$files = Get-ChildItem -LiteralPath $contentRoot -Recurse -File -Filter '*.md' | Sort-Object FullName
foreach ($file in $files) {
    $raw = [IO.File]::ReadAllText($file.FullName)
    $frontMatterMatch = [regex]::Match($raw, '\A---\r?\n(?<front>.*?)\r?\n---\r?\n(?<body>[\s\S]*)\z', 'Singleline')
    if (-not $frontMatterMatch.Success) {
        throw "Could not parse YAML front matter: $($file.FullName)"
    }

    $frontMatter = $frontMatterMatch.Groups['front'].Value
    if ($frontMatter -match '(?m)^description\s*:') {
        $skipped++
        continue
    }

    $titleMatch = [regex]::Match($frontMatter, '(?m)^title\s*:\s*(?<title>.+?)\s*$')
    if (-not $titleMatch.Success) {
        throw "Title not found: $($file.FullName)"
    }

    $title = ConvertFrom-YamlScalar $titleMatch.Groups['title'].Value
    $relativePath = $file.FullName.Substring($contentRoot.Length).TrimStart('\').Replace('\', '/')
    $description = New-SeoDescription $title $frontMatterMatch.Groups['body'].Value $relativePath
    $descriptionLine = 'description: ' + (ConvertTo-YamlDoubleQuoted $description)

    $updated = [regex]::Replace(
        $raw,
        '(?m)^(title\s*:[^\r\n]*)(?<newline>\r?\n)',
        {
            param($match)
            return $match.Groups[1].Value +
                $match.Groups['newline'].Value +
                $descriptionLine +
                $match.Groups['newline'].Value
        },
        1
    )

    if ($Apply) {
        [IO.File]::WriteAllText($file.FullName, $updated, $utf8NoBom)
    }

    $changed++
    if ($preview.Count -lt 30) {
        $preview.Add("$relativePath`n  $description")
    }
}

$preview | ForEach-Object { Write-Output $_ }
Write-Output "TOTAL_CHANGED=$changed SKIPPED_EXISTING=$skipped APPLY=$Apply"
