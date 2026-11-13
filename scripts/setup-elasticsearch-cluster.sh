#!/usr/bin/env bash
# =============================================================================
# GreenSpot WebGIS - Script Khởi tạo & Tối ưu Cụm Elasticsearch 3-Node HA
# Tác giả: Senior DevOps & Search Engineer
# =============================================================================

set -e

echo "=========================================================="
echo "  GREENSPOT ELASTICSEARCH 3-NODE HA CLUSTER INITIALIZER  "
echo "=========================================================="

# 1. Tối ưu hóa OS Kernel (Linux / WSL2)
echo "[1/5] Kiểm tra và thiết lập các thông số OS Host..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Đang cấu hình vm.max_map_count = 262144..."
  sudo sysctl -w vm.max_map_count=262144
  echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

  echo "Tắt Swap để chống suy giảm hiệu năng bộ nhớ JVM..."
  sudo swapoff -a

  echo "Thiết lập ulimit nofile và memlock..."
  ulimit -n 65536
  ulimit -l unlimited
else
  echo "Hệ điều hành hiện tại: $OSTYPE. Nếu dùng Docker Desktop trên Windows, hãy đảm bảo WSL2 có vm.max_map_count=262144."
fi

# 2. Khởi tạo mạng và dịch vụ sinh chứng chỉ TLS
echo "[2/5] Khởi động Container sinh chứng chỉ TLS CA & Nodes..."
docker compose -f docker-compose.elasticsearch-ha.yml up -d setup_certs

echo "Đang đợi tiến trình sinh chứng chỉ hoàn tất..."
docker compose -f docker-compose.elasticsearch-ha.yml wait setup_certs

# 3. Khởi động Cụm 3 Node (es01, es02, es03) và Kibana
echo "[3/5] Khởi động Cụm Elasticsearch 3 Nodes và Kibana..."
docker compose -f docker-compose.elasticsearch-ha.yml up -d es01 es02 es03 kibana

# 4. Kiểm tra sức khỏe Cluster
echo "[4/5] Đang chờ Cụm Elasticsearch sẵn sàng (Green/Yellow)..."
for i in {1..30}; do
  HEALTH=$(docker compose -f docker-compose.elasticsearch-ha.yml exec -T es01 curl -s -k -u elastic:${ELASTICSEARCH_PASSWORD:-GreenSpotSecure2026!} https://localhost:9200/_cluster/health || true)
  STATUS=$(echo $HEALTH | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  if [ "$STATUS" == "green" ] || [ "$STATUS" == "yellow" ]; then
    echo ">> Cụm Elasticsearch đã đạt trạng thái: $STATUS!"
    break
  fi
  echo "Đang chờ cụm khởi động... ($i/30)"
  sleep 4
done

# 5. Đăng ký Snapshot Repository phục vụ Backup
echo "[5/5] Cấu hình Kho lưu trữ Snapshot Backup (es_backup_repo)..."
docker compose -f docker-compose.elasticsearch-ha.yml exec -T es01 curl -s -k -X PUT \
  -u elastic:${ELASTICSEARCH_PASSWORD:-GreenSpotSecure2026!} \
  https://localhost:9200/_snapshot/es_backup_repo \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/snapshots",
      "compress": true
    }
  }'

echo ""
echo "=========================================================="
echo "  KHỞI TẠO CỤM ELASTICSEARCH 3-NODE HA THÀNH CÔNG!        "
echo "  - Elasticsearch HTTPS : https://localhost:9200          "
echo "  - Kibana UI           : http://localhost:5601           "
echo "  - Tài khoản mặc định  : elastic / ${ELASTICSEARCH_PASSWORD:-GreenSpotSecure2026!} "
echo "=========================================================="
