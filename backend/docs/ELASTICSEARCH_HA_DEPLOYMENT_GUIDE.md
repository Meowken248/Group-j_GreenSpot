# HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH ELASTICSEARCH 3-NODE HA CLUSTER CHO HỆ THỐNG GREENSPOT

> **Tài liệu Kỹ thuật DevOps & Search Engineering Chuyên sâu**  
> **Dự án:** GreenSpot - Nền tảng WebGIS & Quản lý Môi trường Đô thị Thông minh  
> **Tác giả:** Senior DevOps / Lead Search Architect  
> **Phiên bản:** 1.0 (Enterprise HA & Security Edition)

---

## 1. KIẾN TRÚC & KẾ HOẠCH PHÂN BỔ SHARD / REPLICA

### 1.1. Kiến trúc Cụm 3 Node (High Availability)
Hệ thống GreenSpot áp dụng mô hình **Multi-Role 3-Node Cluster** (`es01`, `es02`, `es03`) triển khai trên Docker Compose, đảm bảo tính sẵn sàng cao (Zero Downtime) và khả năng chống chịu sự cố (Fault Tolerance):

```
                       [ Load Balancer / Nginx / FastAPI Backend ]
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │ HTTPS                │ HTTPS                │ HTTPS
                    ▼                      ▼                      ▼
            ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
            │     es01      │◄────►│     es02      │◄────►│     es03      │
            │ master,data,  │      │ master,data,  │      │ master,data,  │
            │    ingest     │      │    ingest     │      │    ingest     │
            └───────────────┘      └───────────────┘      └───────────────┘
                    ▲                      ▲                      ▲
                    └──────────────────────┼──────────────────────┘
                                           │ TLS 9300 (Transport Layer)
                                    [ Shared Storage ]
                               (/usr/share/elasticsearch/snapshots)
```

- **Node Roles:**
  - `master`: Tham gia bầu cử Master Node (Quorum: $\lfloor N/2 \rfloor + 1 = 2/3$ nodes). Đảm bảo không xảy ra hiện tượng chia cắt não bộ (**Split-Brain**).
  - `data`: Lưu trữ dữ liệu Shard, thực thi CRUD và tính toán truy vấn tìm kiếm.
  - `ingest`: Tiếp nhận và xử lý tiền dữ liệu (In-flight pipeline) trước khi ghi vào Shard.
- **Kibana Service:** Kết nối HTTPS an toàn tới cụm qua tài khoản `kibana_system`, cung cấp giao diện trực quan hóa và giám sát Stack Monitoring.

---

### 1.2. Chiến lược Tính toán Primary Shards và Replica Shards

#### Nguyên tắc cốt lõi:
1. **Tránh Over-Sharding (Quá nhiều Shard):** Mỗi Shard tiêu tốn từ 20MB đến 40MB bộ nhớ JVM Heap cho cluster state metadata và open file descriptors. Số lượng Shard quá lớn trên một node sẽ gây tràn heap và giật lag GC.
2. **Tránh Under-Sharding (Quá ít Shard):** Dung lượng một Shard vượt quá 50GB sẽ làm chậm quá trình di chuyển (relocate), hồi phục (recovery), và không tận dụng được sức mạnh đa luồng của CPU.

#### Công thức tính toán chuẩn:
$$\text{Kích thước Shard mục tiêu cho Search Index} = 5\text{GB} - 25\text{GB}$$
$$\text{Số lượng Primary Shards } (P) = \left\lceil \frac{\text{Tổng dung lượng dữ liệu dự kiến (GB)}}{\text{Kích thước Shard mục tiêu}} \right\rceil$$

Với quy mô hệ thống GreenSpot (ước tính 10 - 30 GB dữ liệu thực thể trong 3 năm đầu):
- **Số Primary Shards ($P$):** Đặt $P = 3$ (mỗi node nắm giữ 1 Primary Shard của Index chính `greenspot_search_v1`).
- **Số Replica Shards ($R$):** Đặt $R = 1$ hoặc $R = 2$:
  - Khi $R = 1$: Tổng số shards = $3 \times (1 + 1) = 6$ shards (mỗi node chứa đúng 2 shards: 1 Primary + 1 Replica). Hệ thống chịu được 1 node sập bất kỳ mà **100% dữ liệu không bị mất và hệ thống vẫn phục vụ bình thường**.
  - Khi $R = 2$: Tổng số shards = $3 \times (1 + 2) = 9$ shards (mỗi node có 1 Primary và 2 Replicas). Hệ thống chịu được 2 node sập đồng thời.

---

## 2. CÁC BƯỚC CÀI ĐẶT VÀ CẤU HÌNH CỐT LÕI

### 2.1. Cấu hình Hệ điều hành Host (Linux / WSL2 Host OS)

Trước khi chạy Docker Container, bắt buộc thiết lập các tham số hạt nhân Linux để Elasticsearch không bị từ chối khởi động:

```bash
# 1. Tăng giới hạn bản đồ bộ nhớ ảo (bắt buộc cho mmapfs)
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# 2. Tắt Swap để ngăn chặn swapping làm tụt giảm hiệu năng JVM
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# 3. Tăng giới hạn File Descriptors và khóa bộ nhớ trong /etc/security/limits.conf
sudo tee -a /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft memlock unlimited
* hard memlock unlimited
EOF
```

---

### 2.2. File Cấu hình `elasticsearch.yml` Mẫu (Production Grade)

```yaml
# =============================================================================
# GreenSpot Elasticsearch Production Configuration: /usr/share/elasticsearch/config/elasticsearch.yml
# =============================================================================

cluster.name: greenspot-cluster
node.name: ${NODE_NAME}

# Phân bổ vai trò node
node.roles: [ master, data, ingest ]

# Kết nối mạng
network.host: 0.0.0.0
http.port: 9200
transport.port: 9300

# Khám phá cụm và bầu cử Master
discovery.seed_hosts:
  - es01
  - es02
  - es03
cluster.initial_master_nodes:
  - es01
  - es02
  - es03

# Khóa bộ nhớ vật lý chống Swapping
bootstrap.memory_lock: true

# Thiết lập Bảo mật Tích hợp (X-Pack Security)
xpack.security.enabled: true
xpack.security.enrollment.enabled: false

# Cấu hình SSL/TLS cho HTTP Layer (Client <-> Node)
xpack.security.http.ssl:
  enabled: true
  key: certs/${NODE_NAME}/${NODE_NAME}.key
  certificate: certs/${NODE_NAME}/${NODE_NAME}.crt
  certificate_authorities: [ "certs/ca/ca.crt" ]

# Cấu hình SSL/TLS cho Transport Layer (Node <-> Node)
xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  key: certs/${NODE_NAME}/${NODE_NAME}.key
  certificate: certs/${NODE_NAME}/${NODE_NAME}.crt
  certificate_authorities: [ "certs/ca/ca.crt" ]

# Đường dẫn Kho lưu trữ Snapshot Backup
path.repo: [ "/usr/share/elasticsearch/snapshots" ]
```

---

### 2.3. Quy trình Thiết lập Chứng chỉ SSL/TLS và Mật khẩu Bảo mật

1. **Sinh chứng chỉ tự động bằng Script:**
   ```bash
   bash scripts/setup-elasticsearch-cluster.sh
   ```
2. **Thiết lập mật khẩu các tài khoản hệ thống (built-in users):**
   ```bash
   # Tự động tạo ngẫu nhiên hoặc gán mật khẩu tương tác:
   docker exec -it greenspot_es01 bin/elasticsearch-reset-password -u elastic -i
   docker exec -it greenspot_es01 bin/elasticsearch-reset-password -u kibana_system -i
   ```

---

## 3. CHIẾN LƯỢC MAPPING & INDEX DESIGN (TIẾNG VIỆT & TÌM KIẾM TỨC THÌ)

Cấu trúc Index tối ưu kết hợp:
1. **Vietnamese Custom Analyzer:** Tokenizer chuẩn, chuyển chữ thường (`lowercase`), bóc tách dấu Tiếng Việt (`asciifolding`), và loại bỏ từ dừng (`vietnamese_stop`).
2. **Autocomplete Analyzer (Edge N-gram):** Cho phép tìm kiếm gợi ý tức thì ngay khi gõ từ 2 ký tự.
3. **Multi-fields:** Mỗi trường văn bản có trường con `.keyword` để sắp xếp, lọc chính xác và gom nhóm (aggregation).
4. **Geo-Point:** Trường `location` để tính toán cự ly thực tế và lọc theo bán kính.

### Mẫu JSON Mapping Đầy đủ:

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "1s",
    "analysis": {
      "filter": {
        "vietnamese_stop": {
          "type": "stop",
          "stopwords": ["và", "của", "tại", "ở", "trong", "với", "những", "các", "cho", "được", "bị", "đang"]
        },
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        }
      },
      "analyzer": {
        "vietnamese_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "vietnamese_stop"]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "edge_ngram_filter"]
        }
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "id": { "type": "keyword" },
      "entity_type": { "type": "keyword" },
      "code": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "vietnamese_analyzer",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 },
          "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer", "search_analyzer": "standard" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "vietnamese_analyzer",
        "fields": {
          "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer", "search_analyzer": "standard" }
        }
      },
      "category": { "type": "keyword" },
      "status": { "type": "keyword" },
      "priority": { "type": "keyword" },
      "address": {
        "type": "text",
        "analyzer": "vietnamese_analyzer",
        "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
      },
      "district": { "type": "keyword" },
      "ward": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "tags": { "type": "keyword" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}
```

---

## 4. KẾ HOẠCH VẬN HÀNH (OPERATIONS & MAINTENANCE)

### 4.1. Lệnh Kiểm tra Sức khỏe và Trạng thái Cụm

```bash
# 1. Kiểm tra trạng thái Cluster (green / yellow / red)
curl -k -u elastic:GreenSpotSecure2026! https://localhost:9200/_cluster/health?pretty

# 2. Liệt kê danh sách các Nodes và tài nguyên CPU/RAM
curl -k -u elastic:GreenSpotSecure2026! "https://localhost:9200/_cat/nodes?v&h=name,role,heap.percent,cpu,load_1m"

# 3. Xem danh sách Indices, số doc và kích thước ổ đĩa
curl -k -u elastic:GreenSpotSecure2026! "https://localhost:9200/_cat/indices?v&s=index"

# 4. Kiểm tra phân bổ Shards trên từng Node
curl -k -u elastic:GreenSpotSecure2026! "https://localhost:9200/_cat/shards?v"
```

---

### 4.2. Thiết lập Index Lifecycle Management (ILM Policy)

Tự động hóa luân chuyển Index theo pha: **Hot $\rightarrow$ Warm $\rightarrow$ Cold $\rightarrow$ Delete**:

```bash
# Tạo Policy ILM: greenspot_lifecycle_policy
curl -k -X PUT -u elastic:GreenSpotSecure2026! "https://localhost:9200/_ilm/policy/greenspot_lifecycle_policy" \
  -H "Content-Type: application/json" -d '{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "25GB",
            "max_age": "30d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "allocate": { "number_of_replicas": 1 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

---

### 4.3. Chiến lược Backup & Khôi phục Dữ liệu (Snapshot & Restore)

```bash
# 1. Đăng ký Snapshot Repository cục bộ
curl -k -X PUT -u elastic:GreenSpotSecure2026! "https://localhost:9200/_snapshot/es_backup_repo" \
  -H "Content-Type: application/json" -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/snapshots",
      "compress": true
    }
  }'

# 2. Tạo bản Snapshot thủ công ngay lập tức
BACKUP_NAME="snapshot_$(date +%Y%m%d_%H%M%S)"
curl -k -X PUT -u elastic:GreenSpotSecure2026! \
  "https://localhost:9200/_snapshot/es_backup_repo/${BACKUP_NAME}?wait_for_completion=true"

# 3. Kiểm tra danh sách bản sao lưu đã tạo
curl -k -u elastic:GreenSpotSecure2026! "https://localhost:9200/_cat/snapshots/es_backup_repo?v"

# 4. Lệnh Khôi phục (Restore) khi gặp thảm họa
curl -k -X POST -u elastic:GreenSpotSecure2026! \
  "https://localhost:9200/_snapshot/es_backup_repo/${BACKUP_NAME}/_restore" \
  -H "Content-Type: application/json" -d '{
    "indices": "greenspot_search_v1",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

---

### 4.4. Giám sát Hệ thống (Monitoring & Observability)

1. **Kibana Stack Monitoring:** Truy cập `http://localhost:5601/app/monitoring` để quan sát trực tiếp Indexing Rate, Search Latency, JVM Heap, Thread Pools và I/O Disk Usage.
2. **Prometheus & Grafana Exporter:** Tích hợp `elasticsearch_exporter` (port 9114) cào chỉ số metric theo chu kỳ 15s vào Prometheus và hiển thị trên Dashboard Grafana ID `741`.
3. **Cảnh báo (Alerting):** Thiết lập ngưỡng cảnh báo khi:
   - Cluster Status chuyển sang `red` hoặc `yellow` quá 5 phút.
   - JVM Memory Heap $> 85\%$ kéo dài quá 3 chu kỳ GC liên tiếp.
   - Disk Watermark: Low ($85\%$), High ($90\%$), Flood-stage ($95\%$).

---
*Tài liệu được phát triển và kiểm định chuẩn mực theo kiến trúc GreenSpot Clean Architecture & Enterprise SRE Best Practices.*
