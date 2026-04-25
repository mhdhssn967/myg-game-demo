Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("src/assets/run.png")
Write-Host "WIDTH:$($img.Width)"
Write-Host "HEIGHT:$($img.Height)"
$img.Dispose()
