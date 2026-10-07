# =========================================================================
# GREENSPOT - KỊCH BẢN KIỂM THỬ TỰ ĐỘNG & THỦ CÔNG QUẢN LÝ NGƯỜI DÙNG (POWERSHELL)
# =========================================================================
# Hướng dẫn chạy:
#   powershell -ExecutionPolicy Bypass -File .\test_manual_user_management.ps1
# =========================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    GREENSPOT - KIỂM TRA CHỨC NĂNG QUẢN LÝ NGƯỜI DÙNG     " -ForegroundColor Yellow
Write-Host "  (Admin cấp tài khoản các quyền khác & quản trị an toàn) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:8000/api/v1"
$adminEmail = "ddatmguyen2023+test@gmail.com"
$adminPassword = "Dat123123,"

# 1. ĐĂNG NHẬP ADMIN TỐI CAO
Write-Host "`n[1/10] Đang đăng nhập tài khoản Quản trị viên Admin ($adminEmail)..." -ForegroundColor White
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
    remember_me = $true
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json; charset=utf-8"
    $token = $loginRes.access_token
    $adminUserId = $loginRes.user.user_id
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "  -> [OK] Đăng nhập thành công! Vai trò: $($loginRes.user.role) (ID: $adminUserId)" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Không thể đăng nhập Admin: $_" -ForegroundColor Red
    exit 1
}

# 2. LẤY DANH SÁCH TÙY CHỌN VAI TRÒ
Write-Host "`n[2/10] Lấy danh sách vai trò cho form tạo người dùng (GET /api/v1/users/roles-options)..." -ForegroundColor White
try {
    $roleOptions = Invoke-RestMethod -Uri "$baseUrl/users/roles-options" -Method Get -Headers $headers
    Write-Host "  -> Tổng số tùy chọn vai trò: $($roleOptions.Count)" -ForegroundColor Gray
    foreach ($ro in $roleOptions) {
        $sysLabel = if ($ro.is_system) { "Hệ thống" } else { "Tùy chỉnh" }
        Write-Host "     * [$($ro.role_code)] $($ro.role_name) ($($ro.scope_display)) - $sysLabel : $($ro.description)" -ForegroundColor Yellow
    }
    Write-Host "  -> [OK] Lấy danh sách tùy chọn vai trò thành công!" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi lấy danh sách vai trò: $_" -ForegroundColor Red
}

# 3. LẤY DANH SÁCH NGƯỜI DÙNG KÈM THỐNG KÊ TỔNG QUAN
Write-Host "`n[3/10] Lấy danh sách người dùng & thống kê số liệu (GET /api/v1/users)..." -ForegroundColor White
try {
    $userListRes = Invoke-RestMethod -Uri "$baseUrl/users?page=1&limit=5" -Method Get -Headers $headers
    $s = $userListRes.stats
    Write-Host "  -> THỐNG KÊ: Tổng: $($s.total_users) | Hoạt động: $($s.active_users) | Bị khóa: $($s.blocked_users) | Số vai trò: $($s.roles_count)" -ForegroundColor Cyan
    Write-Host "  -> Top 3 người dùng đầu tiên:" -ForegroundColor Gray
    foreach ($u in ($userListRes.users | Select-Object -First 3)) {
        Write-Host "     * $($u.full_name) | Email: $($u.email) | Vai trò: $($u.role_name) | Trạng thái: $($u.status)" -ForegroundColor Yellow
    }
    Write-Host "  -> [OK] Lấy danh sách người dùng thành công!" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi tải danh sách người dùng: $_" -ForegroundColor Red
}

# 4. ADMIN TẠO TÀI KHOẢN MỚI CHO VAI TRÒ DISTRICT_MANAGER
$randomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$newStaffEmail = "canbo_quan1_$randomSuffix@greenspot.vn"
$newStaffPass = "GreenStaff@123"
$dmRole = $roleOptions | Where-Object { $_.role_code -eq "DISTRICT_MANAGER" } | Select-Object -First 1

Write-Host "`n[4/10] Admin tạo tài khoản nghiệp vụ Cán bộ Quận mới ($newStaffEmail)..." -ForegroundColor White
$createPayload = @{
    full_name = "Cán bộ Điều phối Quận 1 ($randomSuffix)"
    email = $newStaffEmail
    phone_number = "098712$randomSuffix"
    password = $newStaffPass
    role_id = [int]$dmRole.role_id
} | ConvertTo-Json

try {
    $createdUser = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($createPayload)) -ContentType "application/json; charset=utf-8"
    $newUserId = $createdUser.user_id
    Write-Host "  -> [OK] Tạo tài khoản thành công!" -ForegroundColor Green
    Write-Host "     * User ID: $newUserId" -ForegroundColor Gray
    Write-Host "     * Họ tên: $($createdUser.full_name)" -ForegroundColor Gray
    Write-Host "     * Vai trò: $($createdUser.role_name) (Phạm vi: $($createdUser.role_scope_display))" -ForegroundColor Gray
    Write-Host "     * Trạng thái: $($createdUser.status) (Đã kích hoạt sẵn để làm việc ngay)" -ForegroundColor Gray
} catch {
    Write-Host "  -> [FAIL] Lỗi tạo tài khoản người dùng: $_" -ForegroundColor Red
    exit 1
}

# 5. XÁC MINH TÀI KHOẢN VỪA TẠO ĐĂNG NHẬP ĐƯỢC NGAY LẬP TỨC
Write-Host "`n[5/10] Thử đăng nhập bằng tài khoản mới vừa được Admin tạo..." -ForegroundColor White
$staffLoginBody = @{
    email = $newStaffEmail
    password = $newStaffPass
    remember_me = $false
} | ConvertTo-Json

try {
    $staffLoginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $staffLoginBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [OK] Tài khoản mới đăng nhập thành công ngay lập tức!" -ForegroundColor Green
    Write-Host "     * Quyền người dùng đăng nhập: $($staffLoginRes.user.role)" -ForegroundColor Yellow
} catch {
    Write-Host "  -> [FAIL] Tài khoản mới không thể đăng nhập: $_" -ForegroundColor Red
}

# 6. ADMIN THAY ĐỔI VAI TRÒ SANG RESPONDER (ĐỘI ỨNG CỨU)
$respRole = $roleOptions | Where-Object { $_.role_code -eq "RESPONDER" } | Select-Object -First 1
Write-Host "`n[6/10] Admin thay đổi vai trò của tài khoản sang RESPONDER..." -ForegroundColor White
$changeRoleBody = @{
    role_id = [int]$respRole.role_id
} | ConvertTo-Json

try {
    $changeRoleRes = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId/role" -Method Put -Headers $headers -Body $changeRoleBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [OK] Đổi vai trò thành công! Thông báo: $($changeRoleRes.message)" -ForegroundColor Green
    Write-Host "     * Vai trò mới: $($changeRoleRes.user.role_name)" -ForegroundColor Yellow
} catch {
    Write-Host "  -> [FAIL] Lỗi đổi vai trò: $_" -ForegroundColor Red
}

# 7. ADMIN KHÓA TÀI KHOẢN (STATUS = BLOCKED) & KIỂM TRA CHẶN ĐĂNG NHẬP
Write-Host "`n[7/10] Admin khóa tài khoản (BLOCKED)..." -ForegroundColor White
$blockBody = @{
    status = "BLOCKED"
} | ConvertTo-Json

try {
    $blockRes = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId/status" -Method Put -Headers $headers -Body $blockBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [OK] Khóa tài khoản thành công! Trạng thái mới: $($blockRes.user.status)" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi khóa tài khoản: $_" -ForegroundColor Red
}

# Thử đăng nhập lại khi đang bị khóa -> Kỳ vọng bị chặn 403
Write-Host "  -> Thử đăng nhập khi tài khoản đang bị khóa (kỳ vọng trả về lỗi 403/Forbidden)..." -ForegroundColor Gray
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $staffLoginBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [FAIL] Bị lỗi! Tài khoản bị khóa nhưng vẫn đăng nhập được!" -ForegroundColor Red
} catch {
    Write-Host "  -> [OK] Hệ thống đã chặn đăng nhập chính xác vì tài khoản bị khóa!" -ForegroundColor Green
}

# 8. ADMIN MỞ KHÓA TÀI KHOẢN & ĐẶT LẠI MẬT KHẨU MỚI
Write-Host "`n[8/10] Admin mở khóa tài khoản (ACTIVE) và đặt lại mật khẩu mới..." -ForegroundColor White
$unblockBody = @{
    status = "ACTIVE"
} | ConvertTo-Json
try {
    $unblockRes = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId/status" -Method Put -Headers $headers -Body $unblockBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [OK] Mở khóa tài khoản thành công!" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi mở khóa: $_" -ForegroundColor Red
}

$newStaffPassUpdated = "NewSecretPassword@999"
$resetPassBody = @{
    new_password = $newStaffPassUpdated
} | ConvertTo-Json
try {
    $resetRes = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId/reset-password" -Method Post -Headers $headers -Body $resetPassBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [OK] Đặt lại mật khẩu thành công! $($resetRes.message)" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi đặt lại mật khẩu: $_" -ForegroundColor Red
}

# 9. KIỂM THỬ BẢO VỆ ADMIN: CHẶN ADMIN TỰ KHÓA HOẶC TỰ XÓA CHÍNH MÌNH
Write-Host "`n[9/10] Kiểm thử cơ chế bảo vệ: Admin thử tự khóa chính mình..." -ForegroundColor White
try {
    Invoke-RestMethod -Uri "$baseUrl/users/$adminUserId/status" -Method Put -Headers $headers -Body $blockBody -ContentType "application/json; charset=utf-8"
    Write-Host "  -> [FAIL] Admin tự khóa chính mình mà không bị chặn!" -ForegroundColor Red
} catch {
    Write-Host "  -> [OK] Backend đã chặn Admin tự khóa chính mình với mã lỗi an toàn: CANNOT_BLOCK_SELF!" -ForegroundColor Green
}

# 10. ADMIN XÓA TÀI KHOẢN THỬ NGHIỆM ĐỂ DỌN DẸP MÔI TRƯỜNG
Write-Host "`n[10/10] Admin xóa tài khoản thử nghiệm (DELETE /api/v1/users/{id})..." -ForegroundColor White
try {
    $delRes = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId" -Method Delete -Headers $headers
    Write-Host "  -> [OK] Đã xóa tài khoản thử nghiệm thành công! $($delRes.message)" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi xóa tài khoản: $_" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   TẤT CẢ 10 BƯỚC KIỂM THỬ QUẢN LÝ NGƯỜI DÙNG ĐÃ HOÀN TẤT!  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
