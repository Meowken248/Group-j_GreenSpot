# =========================================================================
# GREENSPOT - KỊCH BẢN KIỂM THỬ TỰ ĐỘNG & THỦ CÔNG NHANH CHO RBAC (POWERSHELL)
# =========================================================================
# Hướng dẫn chạy:
#   powershell -ExecutionPolicy Bypass -File .\test_manual_rbac.ps1
# =========================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     GREENSPOT - KIỂM TRA HỆ THỐNG PHÂN QUYỀN RBAC & ACL   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://127.0.0.1:8000/api/v1"
$email = "ddatmguyen2023+test@gmail.com"
$password = "Dat123123,"

# 1. ĐĂNG NHẬP ADMIN
Write-Host "`n[1/6] Đang đăng nhập tài khoản Quản trị viên ($email)..." -ForegroundColor White
$loginBody = @{
    email = $email
    password = $password
    remember_me = $true
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.access_token
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    Write-Host "  -> [OK] Đăng nhập thành công! Vai trò: $($loginRes.user.role)" -ForegroundColor Green

    # Kiểm tra endpoint quyền hạn thời gian thực my-permissions
    $myPerms = Invoke-RestMethod -Uri "$baseUrl/rbac/my-permissions" -Method Get -Headers $headers
    Write-Host "  -> [OK] Quyền hạn thời gian thực: $($myPerms.permissions.Count) quyền hệ thống (Vai trò: $($myPerms.role_code))" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Không thể đăng nhập hoặc lấy quyền: $_" -ForegroundColor Red
    exit 1
}

# 2. LẤY DANH SÁCH VAI TRÒ (MÀN 1)
Write-Host "`n[2/6] Kiểm tra Danh sách vai trò (GET /api/v1/rbac/roles)..." -ForegroundColor White
try {
    $rolesRes = Invoke-RestMethod -Uri "$baseUrl/rbac/roles" -Method Get -Headers $headers
    $totalRoles = $rolesRes.total
    $canCreate = $rolesRes.can_create
    Write-Host "  -> Tổng số vai trò hiện tại: $totalRoles (Cho phép tạo tiếp: $canCreate)" -ForegroundColor Gray
    
    # 4 vai trò hệ thống đầu tiên
    $first4 = $rolesRes.roles | Select-Object -First 4
    Write-Host "  -> 4 vai trò hệ thống:" -ForegroundColor Gray
    foreach ($r in $first4) {
        Write-Host "     * [$($r.role_code)] $($r.role_name) - Phạm vi: $($r.scope_display) - $($r.user_count) người dùng" -ForegroundColor Yellow
    }
    Write-Host "  -> [OK] Lấy danh sách vai trò thành công!" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi lấy danh sách vai trò: $_" -ForegroundColor Red
}

# 3. KIỂM TRA MA TRẬN PHÂN QUYỀN 7 CỘT (MÀN 3)
Write-Host "`n[3/6] Kiểm tra Ma trận phân quyền 7 cột ACL (GET /api/v1/rbac/matrix)..." -ForegroundColor White
try {
    $matrixRes = Invoke-RestMethod -Uri "$baseUrl/rbac/matrix" -Method Get -Headers $headers
    $moduleCount = $matrixRes.modules.Count
    $actionsCount = $matrixRes.modules[0].actions.Count
    $actionNames = $matrixRes.modules[0].actions -join ", "
    
    Write-Host "  -> Số lượng Module chức năng: $moduleCount / 15 modules chuẩn" -ForegroundColor Gray
    Write-Host "  -> 7 Cột thao tác chuẩn ACL: $actionNames" -ForegroundColor Gray
    
    if ($moduleCount -eq 15 -and $actionsCount -eq 7) {
        Write-Host "  -> [OK] Ma trận quyền đạt chuẩn 100% (15 modules x 7 actions = 105 permissions)!" -ForegroundColor Green
    } else {
        Write-Host "  -> [WARN] Chưa đủ 15 modules hoặc 7 actions" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  -> [FAIL] Lỗi tải ma trận quyền: $_" -ForegroundColor Red
}

# 4. TẠO VAI TRÒ MỚI THỬ NGHIỆM (MÀN 2)
Write-Host "`n[4/6] Khởi tạo vai trò mới thử nghiệm (POST /api/v1/rbac/roles)..." -ForegroundColor White
$testRoleName = "Can bo Kiem thu $(Get-Random -Minimum 1000 -Maximum 9999)"
$createBody = @{
    role_name = "  $testRoleName  " # Cố tình đưa khoảng trắng thừa
    description = "Vai tro dung de kiem thu quy trinh RBAC"
    scope = "DISTRICT"
} | ConvertTo-Json -Compress
$createBytes = [System.Text.Encoding]::UTF8.GetBytes($createBody)

try {
    $newRole = Invoke-RestMethod -Uri "$baseUrl/rbac/roles" -Method Post -Headers $headers -Body $createBytes -ContentType "application/json; charset=utf-8"
    $newRoleId = $newRole.role_id
    Write-Host "  -> [OK] Đã tạo vai trò mới thành công! ID: $newRoleId - Tên chuẩn hóa: '$($newRole.role_name)'" -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Lỗi tạo vai trò mới: $_" -ForegroundColor Red
    $newRoleId = $null
}

# 5. CẬP NHẬT QUYỀN VỚI QUY TẮC LIÊN ĐỘNG (INTERLOCKING RULES)
if ($newRoleId) {
    Write-Host "`n[5/6] Kiểm tra Quy tắc liên động (PUT /api/v1/rbac/roles/$newRoleId/permissions)..." -ForegroundColor White
    # Chỉ gửi quyền DELETE và EXPORT, Backend phải tự kích hoạt ACCESS và VIEW
    $permBody = @{
        version = 1
        permissions = @("INCIDENTS:DELETE", "AIR_QUALITY:EXPORT")
    } | ConvertTo-Json -Compress
    $permBytes = [System.Text.Encoding]::UTF8.GetBytes($permBody)
    
    try {
        $updateRes = Invoke-RestMethod -Uri "$baseUrl/rbac/roles/$newRoleId/permissions" -Method Put -Headers $headers -Body $permBytes -ContentType "application/json; charset=utf-8"
        Write-Host "  -> Version mới sau khi lưu: $($updateRes.new_version)" -ForegroundColor Gray
        
        # Kiểm tra lại xem ACCESS và VIEW đã được tự động thêm vào chưa
        $matrixReload = Invoke-RestMethod -Uri "$baseUrl/rbac/matrix" -Method Get -Headers $headers
        $savedPerms = $matrixReload.role_permissions."$newRoleId"
        Write-Host "  -> Các quyền hạn thực tế được lưu trong CSDL: $($savedPerms -join ', ')" -ForegroundColor Gray
        
        $hasAccess = $savedPerms -contains "INCIDENTS:ACCESS"
        $hasView = $savedPerms -contains "INCIDENTS:VIEW"
        if ($hasAccess -and $hasView) {
            Write-Host "  -> [OK] Quy tắc liên động tự động hoạt động chính xác (tự kích hoạt ACCESS và VIEW)!" -ForegroundColor Green
        } else {
            Write-Host "  -> [FAIL] Thiếu quyền liên động ACCESS/VIEW" -ForegroundColor Red
        }
    } catch {
        Write-Host "  -> [FAIL] Lỗi lưu quyền hạn: $_" -ForegroundColor Red
    }

    # 6. DỌN DẸP & XOÁ VAI TRÒ THỬ NGHIỆM (MÀN 4)
    Write-Host "`n[6/6] Dọn dẹp vai trò thử nghiệm (DELETE /api/v1/rbac/roles/$newRoleId)..." -ForegroundColor White
    try {
        $delRes = Invoke-RestMethod -Uri "$baseUrl/rbac/roles/$newRoleId" -Method Delete -Headers $headers
        Write-Host "  -> [OK] $($delRes.message)" -ForegroundColor Green
    } catch {
        Write-Host "  -> [FAIL] Không thể xoá vai trò: $_" -ForegroundColor Red
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "    HỆ THỐNG BACKEND & FRONTEND ĐÃ SẴN SÀNG ĐỂ TEST TAY!   " -ForegroundColor Green
Write-Host "    Mở trình duyệt: http://localhost:5173/#rbac           " -ForegroundColor Yellow
Write-Host "==========================================================`n" -ForegroundColor Cyan
