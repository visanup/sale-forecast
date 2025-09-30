$ErrorActionPreference = 'Stop'
$base = 'http://localhost:6601'
$u = 'test' + [guid]::NewGuid().ToString('N').Substring(0,8)
$email = "$u@example.com"
$pwd = 'P@ssw0rd123!'

function Invoke-Json($method, $url, $body) {
  try {
    if ($body) { $json = $body | ConvertTo-Json -Depth 6 }
    $resp = if ($body) { Invoke-RestMethod -Uri $url -Method $method -ContentType 'application/json' -Body $json } else { Invoke-RestMethod -Uri $url -Method $method }
    [pscustomobject]@{ ok=$true; data=$resp }
  } catch {
    $err = $_.Exception
    $status = if ($err.Response -and $err.Response.StatusCode) { [int]$err.Response.StatusCode } else { 0 }
    $text = try { [System.IO.StreamReader]::new($err.Response.GetResponseStream()).ReadToEnd() } catch { '' }
    [pscustomobject]@{ ok=$false; status=$status; error=$err.Message; body=$text }
  }
}

$register = Invoke-Json 'POST' "$base/api/v1/auth/register" @{ email=$email; username=$u; password=$pwd; firstName='Test'; lastName='User' }
$login    = Invoke-Json 'POST' "$base/api/v1/auth/login"    @{ username=$u; password=$pwd }
$access   = if ($login.ok) { $login.data.data.accessToken } else { $null }
$refresh  = if ($login.ok) { $login.data.data.refreshToken } else { $null }
$refreshResp = if ($refresh) { Invoke-Json 'POST' "$base/api/v1/auth/refresh" @{ refreshToken=$refresh } } else { $null }
$newRefresh  = if ($refreshResp -and $refreshResp.ok) { $refreshResp.data.data.refreshToken } else { $null }
$logout   = if ($newRefresh) { Invoke-Json 'POST' "$base/api/v1/auth/logout" @{ refreshToken=$newRefresh } } else { $null }
$forgot   = Invoke-Json 'POST' "$base/api/v1/auth/forgot-password" @{ email=$email }

$result = [pscustomobject]@{
  base     = $base
  user     = $u
  email    = $email
  register = $register
  login    = $login
  refresh  = $refreshResp
  logout   = $logout
  forgot   = $forgot
}

$result | ConvertTo-Json -Depth 8


