$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$h = [IO.File]::ReadAllText((Join-Path $root '..\index.html'), [Text.Encoding]::UTF8)
$h = $h.Replace('<head>', '<head><script src="harness-head.js"></script>').Replace('</body>', '<script src="harness-test.js"></script></body>')
[IO.File]::WriteAllText((Join-Path $root 't.html'), $h, (New-Object Text.UTF8Encoding $false))

$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$prof = Join-Path $root 'profile'
$res = Join-Path $root 'results'; $shots = Join-Path $root 'shots'
New-Item -ItemType Directory -Force $res, $shots | Out-Null
$base = 'file:///' + ($root -replace '\\', '/') + '/t.html'

function Dump($w, $hh, $scn, $file) {
  $a = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$prof", "--window-size=$w,$hh", '--virtual-time-budget=30000', '--dump-dom', "$base#$scn")
  $dom = (& $chrome @a 2>$null) -join "`n"
  $m = [regex]::Match($dom, '(?s)<pre id="testout"[^>]*>(.*?)</pre>')
  if ($m.Success) { [IO.File]::WriteAllText($file, [Net.WebUtility]::HtmlDecode($m.Groups[1].Value)) } else { [IO.File]::WriteAllText($file, "NO OUTPUT`n" + $dom.Substring(0, [Math]::Min(2000, $dom.Length))) }
}
function Shot($w, $hh, $scn, $file) {
  $a = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$prof", "--window-size=$w,$hh", '--virtual-time-budget=30000', "--screenshot=$file", "$base#$scn")
  & $chrome @a 2>$null | Out-Null
}

Dump 1920 1080 'tests' (Join-Path $res 'tests.txt')
foreach ($s in '1920x1080', '1640x1024', '1536x864', '1366x768', '1280x720', '1024x768') {
  $w, $hh = $s -split 'x'
  Dump $w $hh 'layout' (Join-Path $res "layout_$s.txt")
}
foreach ($s in '1920x1080', '1640x1024', '1024x768') {
  $w, $hh = $s -split 'x'
  foreach ($scn in 'ready', 'playing', 'warn', 'done') { Shot $w $hh $scn (Join-Path $shots "${s}_$scn.png") }
}
Shot 1920 1080 'playing-all' (Join-Path $shots '1920x1080_playing-all.png')
'ALL DONE' | Out-File (Join-Path $res 'done.txt')
