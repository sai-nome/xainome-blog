param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$postsRoot = Join-Path $root 'content\posts'

function Convert-ToSeoSlug {
    param(
        [string]$Title,
        [string]$FolderName
    )

    $source = $Title.ToLowerInvariant()
    $source = [regex]::Replace($source, '\s*｜.*$', '')

    $seriesRules = @(
        @{ Pattern = 'rag.*part\s*(\d+)'; Slug = { param($m) "build-rag-app-part-$($m.Groups[1].Value)" } },
        @{ Pattern = '株価予測.*part\s*(\d+)'; Slug = { param($m) "stock-price-prediction-part-$($m.Groups[1].Value)" } },
        @{ Pattern = 'pyxel.*part\s*(\d+)'; Slug = { param($m) "build-game-with-pyxel-part-$($m.Groups[1].Value)" } },
        @{ Pattern = 'listening\s*22.*q\s*11-20'; Slug = { 'ielts-listening-test-22-questions-11-20' } },
        @{ Pattern = 'listening\s*22'; Slug = { 'ielts-listening-test-22-review' } },
        @{ Pattern = 'listening\s*30'; Slug = { 'ielts-listening-test-30-review' } }
    )
    foreach ($rule in $seriesRules) {
        $match = [regex]::Match($source, $rule.Pattern)
        if ($match.Success) {
            return & $rule.Slug $match
        }
    }

    $exactRules = [ordered]@{
        'このブログについて' = 'about-this-blog'
        '仕事について' = 'thoughts-about-work'
        '読書を始めたきっかけ' = 'why-i-started-reading'
        '新年のご挨拶' = 'new-year-greetings-2024'
        '2025/01/04_新年のご挨拶' = 'new-year-greetings-2025'
        '最近あった出来事をだらだらと' = 'recent-life-updates'
        '最近やったゲームをつらつらと' = 'recent-games-roundup-july-2024'
        '最近やったゲームをいくつか書いてみる！' = 'recent-games-roundup-october-2024'
        '最近行った美味しい料理を紹介してみる' = 'recent-restaurant-food-reviews'
        '新しいプラグインをいくつか導入してみた！' = 'new-wordpress-plugins-installed'
        'マグナとふしぎな少女で楽しく英語を学んでいるよ！' = 'learn-english-with-magna-game'
        '生活費や生活環境の都市ランキングを見てみよう！' = 'global-city-cost-of-living-ranking'
        '福岡に帰省して出国前に満喫してきた話' = 'fukuoka-trip-before-moving-abroad'
        'ホームステイ生活が1か月経ったのでその時の話' = 'one-month-homestay-experience-new-zealand'
        'フラットをニュージーランドで借りた時の話' = 'how-to-rent-a-flat-in-new-zealand'
        'キャリア・アンカーという仕事をするタイプを診断してみたよ' = 'career-anchor-assessment'
        'ラチェット＆クランク パラレル・トラブルをクリアしました！' = 'ratchet-and-clank-rift-apart-review'
        '日本はパスポート最強国ではなくなったみたい' = 'japan-passport-ranking-decline'
        'ヒンターベルクのダンジョンを遊んでいるよ！' = 'dungeons-of-hinterberg-review'
        '江戸東京たてもの園に行って古き良き建物を満喫してきたよ' = 'edo-tokyo-open-air-architectural-museum'
        'nzに来ていくつかやった申請系で苦戦したこと' = 'new-zealand-arrival-applications-guide'
        '国際線でnzに行くまでにあったことやlsi初日の感想など' = 'flight-to-new-zealand-and-first-day-at-lsi'
        '水の暇という放置つりゲーをだらだら遊んでいるよ' = 'mizu-no-hima-idle-fishing-game-review'
        'モノクロームメビウスというゲームをプレイしたよ' = 'monochrome-mobius-game-review'
        '【期限切れwofの更新】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'renew-expired-wof-new-zealand'
        '今更chat-gptの有料版に課金してプラグインで遊んでます' = 'chatgpt-plus-plugins-review'
        'mirrativeという配信アプリでちぇいんくろにくるローグをやってます' = 'mirrative-chain-chronicle-rogue-streaming'
        '副業でgcpの案件をやりそうなので勉強中です' = 'learning-gcp-for-freelance-project'
        'githubに今更創作物を登録してみました' = 'publishing-personal-projects-on-github'
        '動画編集ソフトでaviutlを使っています' = 'aviutl-video-editing-software'
        'antcicada(アントシカダ)でコオロギラーメンを食べに行きました！' = 'antcicada-cricket-ramen-review'
        'kaggleのスコアを少しずつ上げていってる話' = 'improving-kaggle-competition-score'
        'kaggleをとりあえず触ってみて少しづつ予測や分類を理解していくぞ！' = 'kaggle-prediction-and-classification-basics'
        'やっていたkaggleのコンペが終わったので少し振り返る' = 'kaggle-competition-retrospective'
        '最近発売された\"sand land(サンドランド)\"をプレイしてるよ' = 'sand-land-game-review'
        '自分が作ったaiが赤の他人のaiとsnsでやり取りする姿は面白い' = 'ai-agents-communicating-on-social-media'
        'sagemakerエンドポイントを利用してモデル管理を調べた話' = 'sagemaker-endpoint-model-management'
        'ウェブサイトを少しづつ改修している話' = 'website-improvement-progress'
        '簿記の勉強を暇なタイミングやる！世界でも使えそうかも？' = 'learning-bookkeeping-for-global-career'
        'pcloudがセールをやってたので購入してみたよ！' = 'pcloud-lifetime-storage-review'
        'bigqueryのテーブルのカラム説明欄に一括で追記したい！' = 'bulk-update-bigquery-column-descriptions'
        '20250216_土日にやったことを英語で書く' = 'weekend-diary-in-english-february-2025'
        '【easter showでイベントに参加してきたよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'auckland-easter-show-review'
        '【寿司の作り方を学べばレストランでも使えるかも！？】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'learning-to-make-sushi-new-zealand'
        '【the werecleaner】｜アクションゲーム × 英語力アップ／ielts対策' = 'the-werecleaner-game-review'
        '【matarikiというマオリの元旦を満喫する】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'matariki-maori-new-year-experience'
        '【アクティビティでice skatingを楽しんだよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'ice-skating-activity-new-zealand'
        '【myirのアカウント有効化で苦労したよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'activate-myir-account-new-zealand'
        '【real gunsでショットガンや対物ライフルを撃ってきたよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'real-guns-shooting-experience-new-zealand'
        '【南島ロードトリップ~ ネット、シャワー、ベッドやガスの準備~】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'prepare-for-new-zealand-south-island-road-trip'
        '【農家は replace() されました】｜プログラミングゲーム × 英語力アップ／ielts対策' = 'the-farmer-was-replaced-game-review'
        '【katiki周りで観光しながらアシカをみたよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'katiki-point-seals-road-trip'
        '【ロードトリップ ~ timaru から oamaruまで】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'roadtrip-timaru-to-oamaru'
        '【trade meを利用して車を売却した話】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'sell-car-on-trade-me-new-zealand'
        '【裁判所や警察署から請求書が来たり車の修理で貯金が減った話】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'court-police-bills-and-car-repair-new-zealand'
        '【brewster hutまで登って更に氷河の近くまでハイキングしに行ったよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'brewster-hut-glacier-hike'
        '【オーストラリアのワーキングホリデービザの申請してきたよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'australia-working-holiday-visa-application'
        '面白そうなサイトを2つほど紹介してみるよ' = 'two-interesting-websites'
        '自身の健康のためにやっていること、変えたこと' = 'healthy-lifestyle-changes'
        '最近読んだ本をいくつか紹介する_2024/09/24' = 'book-reviews-september-2024'
        '会社に退職する意向を伝えた話' = 'telling-my-company-i-will-resign'
        '知人が見つかったらしい' = 'missing-friend-found'
        '今度は私が失踪する番！' = 'taking-a-break-from-mobile-games'
        'たまにはゲームに夢中になってだらけてもいいんじゃない？' = 'taking-time-to-relax-with-games'
        'pc故障したので開発を中断しています' = 'pc-failure-paused-development'
        '惑星をテラフォーミングする ~ 完 ~' = 'the-planet-crafter-terraforming-complete'
        '仕事でミスが発生した場合、何を考えるか？どう対応するか？' = 'how-to-handle-mistakes-at-work'
        '生成aiのさらなる進化と今後の仕事について' = 'generative-ai-evolution-and-future-of-work'
        '最近の生成aiを3つほど試してみたよ！' = 'three-generative-ai-tools-tested'
        '生成aiでプロンプトを使うときに大切な26項目' = '26-tips-for-generative-ai-prompts'
        '日本人向けに作られた性格テストで自身の性格をより正確に知ろう！' = 'japanese-personality-test-review'
        '遺伝子検査で自分の特性や先祖を調べて新たな発見をしてみよう！' = 'dna-test-traits-and-ancestry'
        '遺伝子検査の結果が返ってきたのでどんなものか見てみよう！' = 'dna-test-results-review'
        '低温調理で健康にいい料理を作り始めた話' = 'healthy-sous-vide-cooking'
        'ヨーグルトメーカーで無限にヨーグルトを作って健康を意識する！' = 'homemade-yogurt-with-yogurt-maker'
        '筋トレを始めました！' = 'starting-strength-training'
        '髭脱毛をやってきた！' = 'laser-beard-hair-removal-experience'
        'mri検査を初見で受けてきたよ' = 'first-mri-scan-experience'
        '電動歯ブラシを使うことで歯に関する問題はほぼ消えた話' = 'electric-toothbrush-dental-health'
        '【歯医者に行って虫歯か確認した話】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'dentist-checkup-for-cavities-new-zealand'
        '米を鍋で炊いたら意外と簡単だったよ' = 'how-to-cook-rice-in-a-pot'
        '【米を鍋で炊ければどこでも米が食べられるよ】｜ワーホリ in nz × 英語力アップ／ielts対策' = 'how-to-cook-rice-in-a-pot'
    }
    if ($exactRules.Contains($Title.ToLowerInvariant())) {
        return $exactRules[$Title.ToLowerInvariant()]
    }

    $replacements = [ordered]@{
        '【|】|「|」|（|）|\(|\)|！|!|？|\?|、|。|：|:|｜|／|~|〜|×|_' = ' '
        'ワーホリ\s*in\s*nz' = 'new zealand working holiday'
        '英語力アップ|ielts対策' = ''
        '実績を全部取得|実績を全て取った|実績を無事コンプ|実績コンプ|100%クリア|100クリア' = ' achievements'
        'クリアしました|クリアしたよ|プレイしてみたよ|プレイしたよ|遊んでみたよ|遊んでいるよ|遊んでいる' = ' review'
        '行ってきたよ|行ってきました|行ったよ|行った話|観光をしてきたよ|満喫してきたよ|楽しんできたよ' = ' visit'
        '体験してきたよ|経験してきたよ|やってきたよ' = ' experience'
        '作ってみよう|作ってみたよ|作成してみる' = ' tutorial'
        '使ってみよう|使ってみたよ|触ってみたよ|試してみたよ' = ' review'
        '学んできたよ|学ぶ|勉強中です|勉強を再開し始めました' = ' study'
        '申請してみたよ|申請してきたよ' = ' application guide'
        '購入したよ|買って|購入してみました' = ' buying guide'
        '仕事をしているよ|働いているよ|働いた感想' = ' work experience'
        'ロードトリップ|南島ロードトリップ' = ' road trip '
        'ニュージーランド|nz' = ' new zealand '
        'オーストラリア' = ' australia '
        '東京国立博物館' = ' tokyo national museum '
        '国立科学博物館' = ' national museum of nature and science '
        '東洋文庫ミュージアム' = ' toyo bunko museum '
        '古代オリエント博物館' = ' ancient orient museum '
        '刀剣博物館' = ' japanese sword museum '
        '昆虫展' = ' insect exhibition '
        'モネ\s*睡蓮のとき' = ' monet water lilies exhibition '
        'ルイーズ・ブルジョワ展' = ' louise bourgeois exhibition '
        'ハニワ展' = ' haniwa exhibition '
        '特別展.*鳥' = ' bird exhibition '
        '簿記3級' = ' bookkeeping level 3 '
        '簿記' = ' bookkeeping '
        'e資格' = ' jdla deep learning engineer exam '
        '深層学習前編' = ' deep learning fundamentals part 1 '
        '深層学習後編.*開発環境編' = ' deep learning fundamentals part 2 development environment '
        '応用数学と機械学習編' = ' applied mathematics machine learning '
        '機械学習' = ' machine learning '
        'ニューラルネットワーク' = ' neural network '
        '生成ai' = ' generative ai '
        '音声合成' = ' voice synthesis '
        '仮想環境' = ' virtual environment '
        '株価予測' = ' stock price prediction '
        '短期売買' = ' short term trading '
        '投資信託' = ' mutual funds '
        'ウェブサイト|自身のサイト' = ' website '
        'パフォーマンス' = ' performance '
        'セキュリティ' = ' cybersecurity '
        'パスキー' = ' passkeys '
        'スクレイピング' = ' web scraping '
        '転職メール' = ' job search email '
        '勤怠管理' = ' attendance management '
        '遺伝子検査' = ' dna test '
        '性格テスト' = ' personality test '
        '仕事' = ' work '
        '健康' = ' health '
        '料理' = ' cooking '
        '歯医者|虫歯' = ' dentist cavities '
        '車の修理|車のパーツを修理' = ' car repair '
        '中古車' = ' used car '
        '車を売却' = ' sell car '
        '運転免許|driver licence' = ' driver licence '
        'ワーキングホリデービザ' = ' working holiday visa '
        '一時帰国' = ' return trip to japan '
        'トランジット|transit' = ' airport transit '
        '検閲' = ' customs inspection '
        'ハウスキーピング' = ' housekeeping '
        'ファームジョブ|ファーム' = ' farm job '
        'ピッキング' = ' picking '
        '清掃' = ' cleaning '
        '観光地巡り|観光地とお店をめぐる' = ' travel guide '
        '星空' = ' stargazing '
        '洞窟探索' = ' cave tour '
        '光る虫' = ' glowworms '
        '動物たち|いろんな動物' = ' animals '
        'プール' = ' pools '
        'サウナ' = ' sauna '
        'ラテアート' = ' latte art '
        '寿司' = ' sushi '
        '脱出ゲーム' = ' escape room '
        'ゲーム' = ' game '
        '本' = ' books '
        'プログラマー脳' = ' programmers brain book review '
        '記事' = ' post '
        '話' = ''
        '感想' = ' review '
        'について' = ''
        'という' = ' '
        'まで' = ' to '
        'から' = ' from '
        'で' = ' '
        'を' = ' '
        'に' = ' '
        'の' = ' '
        'と' = ' '
        'や' = ' '
        'している|してる|した|する|始めた|始めました|楽しむ|満喫する|見てきた|書いてみる|書いていくよ' = ' '
    }

    $working = $source
    foreach ($pair in $replacements.GetEnumerator()) {
        $working = [regex]::Replace($working, $pair.Key, $pair.Value)
    }

    $working = [regex]::Replace($working, '[^\x00-\x7F]+', ' ')
    $working = $working -replace '&', ' and '
    $working = $working -replace '[^a-z0-9]+', '-'
    $working = $working.Trim('-')
    $working = [regex]::Replace($working, '(^|-)(a|an|the|my|some)(?=-|$)', '')
    $working = [regex]::Replace($working, '-{2,}', '-').Trim('-')

    if ($working.Length -gt 75) {
        $parts = $working -split '-'
        $kept = @()
        $length = 0
        foreach ($part in $parts) {
            if (($length + $part.Length + 1) -gt 75) { break }
            $kept += $part
            $length += $part.Length + 1
        }
        $working = $kept -join '-'
    }

    if ([string]::IsNullOrWhiteSpace($working) -or $working.Length -lt 4) {
        throw "Could not create a meaningful slug for: $Title"
    }
    return $working
}

$items = @()
$seen = @{}
$files = Get-ChildItem -LiteralPath $postsRoot -Recurse -File -Filter 'index.md'
foreach ($file in $files) {
    $text = [IO.File]::ReadAllText($file.FullName)
    $titleMatch = [regex]::Match($text, '(?m)^title:\s*["'']?(.*?)["'']?\s*$')
    $dateMatch = [regex]::Match($text, '(?m)^date:\s*(\d{4})-(\d{2})-(\d{2})')
    if (-not $titleMatch.Success -or -not $dateMatch.Success) {
        throw "Missing title/date: $($file.FullName)"
    }
    $title = $titleMatch.Groups[1].Value
    $folder = $file.Directory.Name
    $existingSlug = [regex]::Match($text, '(?m)^slug:\s*["'']?(.*?)["'']?\s*$').Groups[1].Value
    $slug = if ($existingSlug) { $existingSlug } else { Convert-ToSeoSlug -Title $title -FolderName $folder }

    $baseSlug = $slug
    $suffix = 2
    while ($seen.ContainsKey($slug)) {
        $slug = "$baseSlug-$suffix"
        $suffix++
    }
    $seen[$slug] = $file.FullName

    $year = $dateMatch.Groups[1].Value
    $month = $dateMatch.Groups[2].Value
    $oldPath = "/posts/$year/$month/$folder/"
    $relative = $file.FullName.Substring($root.Length + 1)

    $items += [PSCustomObject]@{
        File = $file.FullName
        RelativePath = $relative
        Title = $title
        Slug = $slug
        OldPath = $oldPath
    }
}

$invalid = $items | Where-Object { $_.Slug -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' }
$duplicates = $items | Group-Object Slug | Where-Object Count -gt 1
if ($invalid -or $duplicates) {
    throw 'Slug validation failed.'
}

if (-not $Apply) {
    $items | Sort-Object RelativePath | ForEach-Object {
        "$($_.RelativePath)`t$($_.Title)`t$($_.Slug)"
    }
    Write-Output "TOTAL=$($items.Count) UNIQUE=$(@($items | Select-Object -ExpandProperty Slug -Unique).Count)"
    exit 0
}

foreach ($item in $items) {
    $text = [IO.File]::ReadAllText($item.File)

    if ([regex]::IsMatch($text, '(?m)^slug:')) {
        $text = [regex]::Replace($text, '(?m)^slug:\s*.*$', "slug: `"$($item.Slug)`"")
    } else {
        $dateLine = [regex]::Match($text, '(?m)^date:\s*.*$')
        if (-not $dateLine.Success) { throw "Date line not found: $($item.File)" }
        $insertAt = $dateLine.Index + $dateLine.Length
        $text = $text.Insert($insertAt, "`r`nslug: `"$($item.Slug)`"")
    }

    if (-not [regex]::IsMatch($text, '(?m)^aliases:')) {
        $slugLine = [regex]::Match($text, '(?m)^slug:\s*.*$')
        $insertAt = $slugLine.Index + $slugLine.Length
        $aliasBlock = "`r`naliases:`r`n  - `"$($item.OldPath)`""
        $text = $text.Insert($insertAt, $aliasBlock)
    }

    [IO.File]::WriteAllText($item.File, $text, [Text.UTF8Encoding]::new($false))
}

Write-Output "UPDATED=$($items.Count)"
