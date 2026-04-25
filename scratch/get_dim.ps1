Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("src/assets/wave.png")
Write-Host "WIDTH:$($img.Width)"
Write-Host "HEIGHT:$($img.Height)"
$img.Dispose()
