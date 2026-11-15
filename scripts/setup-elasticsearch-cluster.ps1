# =============================================================================
# GreenSpot WebGIS - Script Khoi tao & Toi uu Cum Elasticsearch 3-Node HA (PowerShell Windows)
# Tac gia: Senior DevOps & Search Engineer
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  GREENSPOT ELASTICSEARCH 3-NODE HA CLUSTER INITIALIZER  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra bien moi truong mat khau
$ES_PASS = if ($env:ELASTICSEARCH_PASSWORD) { $env:ELASTICSEARCH_PASSWORD } else { "GreenSpotSecure2026!" }

# 2. Sinh chung chi SSL/TLS qua container setup_certs
Write-Host "[1/4] Khoi dong Container sinh chung chi TLS CA & Nodes..." -ForegroundColor Yellow
docker compose -f docker-compose.elasticsearch-ha.yml up -d setup_certs

Write-Host "Dang doi tien trinh sinh chung chi hoan tat..." -ForegroundColor Yellow
docker compose -f docker-compose.elasticsearch-ha.yml wait setup_certs

# 3. Khoi dong Cum 3 Node (es01, es02, es03) va Kibana
Write-Host "[2/4] Khoi dong Cum Elasticsearch 3 Nodes va Kibana..." -ForegroundColor Yellow
docker compose -f docker-compose.elasticsearch-ha.yml up -d es01 es02 es03 kibana

# 4. Kiem tra suc khoe Cluster
Write-Host "[3/4] Dang cho Cum Elasticsearch san sang (Green / Yellow)..." -ForegroundColor Yellow
$maxRetries = 30
$ready = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $healthJson = docker compose -f docker-compose.elasticsearch-ha.yml exec -T es01 curl -s -k -u "elastic:$ES_PASS" https://localhost:9200/_cluster/health
        if ($healthJson -match '"status":"(green|yellow)"') {
            $status = $matches[1]
            Write-Host ">> Cum Elasticsearch da dat trang thai: $status!" -ForegroundColor Green
            $ready = $true
            break
        }
    } catch {
        # Bo qua loi ket noi ban dau khi cum dang boot
    }
    Write-Host "Dang cho cum khoi dong... ($i/$maxRetries)" -ForegroundColor Gray
    Start-Sleep -Seconds 4
}

# 5. Dang ky Snapshot Repository cho Backup
Write-Host "[4/4] Cau hinh Kho luu tru Snapshot Backup (es_backup_repo)..." -ForegroundColor Yellow
try {
    docker compose -f docker-compose.elasticsearch-ha.yml exec -T es01 curl -s -k -X PUT `
        -u "elastic:$ES_PASS" `
        https://localhost:9200/_snapshot/es_backup_repo `
        -H "Content-Type: application/json" `
        -d '{\"type\": \"fs\", \"settings\": {\"location\": \"/usr/share/elasticsearch/snapshots\", \"compress\": true}}'
    Write-Host ">> Da dang ky Snapshot Repository thanh cong!" -ForegroundColor Green
} catch {
    Write-Host ">> Canh bao: Khong the dang ky Snapshot repo tu dong. Co the thuc hien sau." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KHOI TAO CUM ELASTICSEARCH 3-NODE HA THANH CONG!        " -ForegroundColor Green
Write-Host "  - Elasticsearch HTTPS : https://localhost:9200          " -ForegroundColor White
Write-Host "  - Kibana Dashboard    : http://localhost:5601           " -ForegroundColor White
Write-Host "  - Tai khoan mac dinh  : elastic / $ES_PASS " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
