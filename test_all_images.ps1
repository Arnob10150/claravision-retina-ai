$API = "https://claravision-retina-ai-production.up.railway.app/predict"
$BASE = "D:\claravision-retina-ai\FD3611\FD3611"
$CSV  = "D:\claravision-retina-ai\test_results.csv"

$LABEL_MAP = @{
    "Diabetic_Retinopathy" = "Diabetic Retinopathy"
    "Media_Hazy"           = "Media Hazy"
    "Myopic_Retinopathy"   = "Myopic Retinopathy"
    "Normal"               = "Normal"
    "Optic_Disc_Disorder"  = "Optic Disc Disorder"
}

# Collect all images
$images = @()
foreach ($folder in $LABEL_MAP.Keys) {
    $label = $LABEL_MAP[$folder]
    Get-ChildItem "$BASE\$folder" -Include "*.png","*.jpg","*.jpeg" -Recurse | ForEach-Object {
        $images += [PSCustomObject]@{ Path = $_.FullName; TrueLabel = $label }
    }
}

Write-Host "Total images: $($images.Count)" -ForegroundColor Cyan
"file,true_label,predicted,confidence,uncertainty,correct" | Out-File $CSV -Encoding utf8

$total = $images.Count
$done  = 0
$correct = 0
$perClass = @{}
$LABEL_MAP.Values | ForEach-Object { $perClass[$_] = @{correct=0; total=0} }

# Process in parallel batches of 10
$batchSize = 10
for ($i = 0; $i -lt $images.Count; $i += $batchSize) {
    $batch = $images[$i .. [Math]::Min($i + $batchSize - 1, $images.Count - 1)]

    $jobs = $batch | ForEach-Object {
        $img = $_
        Start-Job -ScriptBlock {
            param($path, $trueLabel, $api)
            $raw = curl.exe -s --max-time 30 -X POST $api -F "file=@`"$path`""
            try {
                $j = $raw | ConvertFrom-Json
                "$path|$trueLabel|$($j.predicted_class)|$($j.confidence)|$($j.uncertainty_level)"
            } catch {
                "$path|$trueLabel|ERROR|0|unknown"
            }
        } -ArgumentList $img.Path, $img.TrueLabel, $API
    }

    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job

    foreach ($r in $results) {
        $parts = $r -split '\|'
        if ($parts.Count -ge 5) {
            $file   = $parts[0]
            $true_l = $parts[1]
            $pred   = $parts[2]
            $conf   = $parts[3]
            $unc    = $parts[4]
            $isOk   = ($true_l -eq $pred)

            "$([System.IO.Path]::GetFileName($file)),$true_l,$pred,$conf,$unc,$isOk" | Out-File $CSV -Append -Encoding utf8

            $done++
            if ($isOk) { $correct++ }
            if ($perClass.ContainsKey($true_l)) {
                $perClass[$true_l].total++
                if ($isOk) { $perClass[$true_l].correct++ }
            }
        }
    }

    $pct = [math]::Round($correct / [math]::Max($done,1) * 100, 1)
    Write-Host "[$done/$total] Overall accuracy: $pct%" -ForegroundColor Green
}

Write-Host "`n=== FINAL RESULTS ===" -ForegroundColor Yellow
Write-Host "Overall: $correct/$total = $([math]::Round($correct/$total*100,1))%" -ForegroundColor Cyan
Write-Host ""
foreach ($cls in ($perClass.Keys | Sort-Object)) {
    $d = $perClass[$cls]
    if ($d.total -gt 0) {
        $a = [math]::Round($d.correct / $d.total * 100, 1)
        Write-Host "$cls : $($d.correct)/$($d.total) = $a%" -ForegroundColor White
    }
}
Write-Host "`nResults saved to: $CSV" -ForegroundColor Green
