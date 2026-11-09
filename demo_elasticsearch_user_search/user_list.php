<?php
// user_list.php - Trang tìm kiếm User với thanh năng lượng tùy chỉnh độ sai số (Fuzziness)
$dbFile = __DIR__ . '/users.db';
$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Lấy toàn bộ danh sách users có sẵn trong database để người dùng kiểm tra
$allUsers = $pdo->query("SELECT * FROM users ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

$keyword = isset($_GET['q']) ? trim($_GET['q']) : '';
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'compare'; // 'sql', 'es', 'compare'

// Thanh năng lượng độ sai số: 0, 1, 2, AUTO
$fuzziness = isset($_GET['fuzziness']) ? $_GET['fuzziness'] : '1';
if (!in_array($fuzziness, ['0', '1', '2', 'AUTO'])) {
    $fuzziness = '1';
}

$sqlUsers = [];
$sqlTime = 0;

$esUsers = [];
$esTime = 0;
$esError = '';
$esQueryJson = '';

// ==========================================
// 1. XỬ LÝ PHẦN 1: SQL LIKE
// ==========================================
if ($mode === 'sql' || $mode === 'compare') {
    $t0 = microtime(true);
    if ($keyword !== '') {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE name LIKE :kw COLLATE NOCASE");
        $stmt->execute(['kw' => '%' . $keyword . '%']);
        $sqlUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $sqlUsers = $allUsers;
    }
    $sqlTime = round((microtime(true) - $t0) * 1000, 2);
}

// ==========================================
// 2. XỬ LÝ PHẦN 2: ELASTICSEARCH VỚI FUZZINESS TÙY CHỈNH
// ==========================================
if ($mode === 'es' || $mode === 'compare') {
    $t0 = microtime(true);
    if ($keyword !== '') {
        // Cấu hình query dựa trên thanh năng lượng sai số
        if ($fuzziness === '0') {
            // Mức 0: Bắt buộc chính xác 100% (không có sai số)
            $esQuery = [
                "query" => [
                    "bool" => [
                        "should" => [
                            ["match" => ["name" => ["query" => $keyword, "fuzziness" => 0, "boost" => 2.0]]],
                            ["term" => ["name.keyword" => ["value" => $keyword, "boost" => 3.0]]],
                            ["wildcard" => ["name" => ["value" => "*" . strtolower($keyword) . "*", "boost" => 1.0]]]
                        ]
                    ]
                ]
            ];
        } else {
            // Mức 1, 2, hoặc AUTO: Áp dụng Levenshtein Distance tương ứng
            $fuzzVal = ($fuzziness === 'AUTO') ? 'AUTO' : (int)$fuzziness;
            $esQuery = [
                "query" => [
                    "bool" => [
                        "should" => [
                            [
                                "match" => [
                                    "name" => [
                                        "query" => $keyword,
                                        "fuzziness" => $fuzzVal,
                                        "boost" => 2.5
                                    ]
                                ]
                            ],
                            [
                                "multi_match" => [
                                    "query" => $keyword,
                                    "type" => "bool_prefix",
                                    "fields" => ["name"],
                                    "boost" => 1.5
                                ]
                            ],
                            [
                                "wildcard" => [
                                    "name" => [
                                        "value" => "*" . strtolower($keyword) . "*",
                                        "boost" => 1.0
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ];
        }

        $esQueryJson = json_encode($esQuery, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $ch = curl_init("http://localhost:9200/users/_search");
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($ch, CURLOPT_POSTFIELDS, $esQueryJson);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        $res = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err) {
            $esError = "Lỗi kết nối ES: $err";
        } elseif ($code === 200) {
            $data = json_decode($res, true);
            if (isset($data['hits']['hits'])) {
                foreach ($data['hits']['hits'] as $hit) {
                    $esUsers[] = [
                        'id' => $hit['_id'],
                        'name' => $hit['_source']['name'],
                        'email' => $hit['_source']['email'],
                        'score' => round($hit['_score'], 3)
                    ];
                }
            }
        } else {
            $esError = "ES trả về mã lỗi: $code";
        }
    } else {
        // Chưa nhập từ khóa -> Lấy toàn bộ từ Elasticsearch
        $esQueryJson = '{"query": {"match_all": {}}, "size": 100}';
        $ch = curl_init("http://localhost:9200/users/_search");
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
        curl_setopt($ch, CURLOPT_POSTFIELDS, $esQueryJson);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $res = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($res, true);
        if (isset($data['hits']['hits'])) {
            foreach ($data['hits']['hits'] as $hit) {
                $esUsers[] = [
                    'id' => $hit['_id'],
                    'name' => $hit['_source']['name'],
                    'email' => $hit['_source']['email'],
                    'score' => '-'
                ];
            }
        }
    }
    $esTime = round((microtime(true) - $t0) * 1000, 2);
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TÌM KIẾM USER VỚI ELASTICSEARCH</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .wrapper { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 26px; color: #1e3a8a; margin: 0 0 6px 0; }
        .header p { color: #64748b; margin: 0; font-size: 15px; }

        /* Card danh sách toàn bộ users */
        .all-users-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
        .all-users-title { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .all-users-title h3 { margin: 0; font-size: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
        .all-users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 14px; }
        .user-chip { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 13px; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; cursor: pointer; text-decoration: none; color: inherit; }
        .user-chip:hover { background: #e0f2fe; border-color: #38bdf8; transform: translateY(-1px); }
        .user-chip strong { color: #0f172a; }
        .user-chip small { color: #64748b; font-size: 11px; }

        /* Card tìm kiếm */
        .search-card { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); margin-bottom: 24px; }
        .mode-selector { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .mode-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 14px; text-decoration: none; color: #334155; font-weight: 500; cursor: pointer; }
        .mode-btn.active { background: #1e40af; color: white; border-color: #1e40af; font-weight: 600; }

        .search-form { display: flex; gap: 10px; margin-bottom: 20px; }
        .search-form input[type="text"] { flex: 1; padding: 14px 18px; font-size: 16px; border: 2px solid #cbd5e1; border-radius: 8px; outline: none; transition: border-color 0.2s; }
        .search-form input[type="text"]:focus { border-color: #2563eb; }
        .search-form button { background: #2563eb; color: #fff; border: none; padding: 0 26px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .search-form button:hover { background: #1d4ed8; }
        .btn-reset { background: #94a3b8; color: white; text-decoration: none; padding: 14px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-flex; align-items: center; }

        /* THANH NĂNG LƯỢNG SAI SỐ (FUZZINESS ENERGY METER) */
        .energy-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-top: 10px; }
        .energy-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .energy-title { font-weight: 700; font-size: 14px; color: #0f172a; display: flex; align-items: center; gap: 6px; }
        .energy-badge { padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 700; }
        
        .fuzz-0 { background: #fee2e2; color: #991b1b; }
        .fuzz-1 { background: #fef3c7; color: #92400e; }
        .fuzz-2 { background: #dcfce7; color: #166534; }
        .fuzz-auto { background: #e0e7ff; color: #3730a3; }

        .energy-bar-container { height: 12px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 14px; position: relative; }
        .energy-bar-fill { height: 100%; transition: width 0.3s ease, background 0.3s ease; border-radius: 9999px; }
        .fill-0 { width: 5%; background: #ef4444; }
        .fill-1 { width: 50%; background: #f59e0b; }
        .fill-2 { width: 100%; background: #10b981; }
        .fill-auto { width: 80%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); }

        .energy-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .energy-btn { display: block; text-align: center; padding: 10px 12px; border: 2px solid #cbd5e1; border-radius: 8px; text-decoration: none; color: #334155; font-size: 13px; font-weight: 600; background: white; transition: all 0.2s; }
        .energy-btn:hover { border-color: #94a3b8; background: #f1f5f9; }
        .energy-btn.active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; box-shadow: 0 0 0 1px #2563eb; }
        .energy-desc { font-size: 11px; font-weight: normal; color: #64748b; margin-top: 4px; display: block; }

        /* Kết quả tìm kiếm */
        .banner-highlight { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 14px; color: #065f46; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 800px) { .grid-2 { grid-template-columns: 1fr; } .energy-buttons { grid-template-columns: 1fr 1fr; } }

        .column-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); display: flex; flex-direction: column; }
        .col-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; margin-bottom: 12px; }
        .col-title { font-size: 16px; font-weight: 700; }
        .badge-red { background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 14px; }
        th { background: #f8fafc; color: #475569; font-weight: 600; }
        .score-tag { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .empty-box { padding: 30px 16px; text-align: center; border-radius: 8px; margin-top: 10px; }
        .empty-red { background: #fff1f2; color: #be123c; border: 1px dashed #fecdd3; }
        .empty-gray { background: #f8fafc; color: #64748b; }
        .query-info { font-family: monospace; font-size: 12px; background: #0f172a; color: #38bdf8; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; word-break: break-all; }
        .time-tag { font-size: 11px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>TÌM KIẾM USER VỚI ELASTICSEARCH</h1>
            <p>Từ câu SQL LIKE đến Elasticsearch — Hướng dẫn thực hành có điều khiển sai số</p>
        </div>

        <!-- 1. BẢNG HIỂN THỊ TOÀN BỘ 18 USERS ĐANG CÓ TRONG HỆ THỐNG -->
        <div class="all-users-box">
            <div class="all-users-title" onclick="document.getElementById('usersGrid').style.display = (document.getElementById('usersGrid').style.display === 'none' ? 'grid' : 'none')">
                <h3>📋 Danh sách tất cả Users đang có trong Database (<?= count($allUsers) ?> người)</h3>
                <span style="font-size: 12px; color: #2563eb; font-weight: 600;">(Bấm để ẩn/hiện danh sách)</span>
            </div>
            <div id="usersGrid" class="all-users-grid">
                <?php foreach ($allUsers as $u): ?>
                    <a href="user_list.php?mode=<?= $mode ?>&fuzziness=<?= $fuzziness ?>&q=<?= urlencode($u['name']) ?>" class="user-chip" title="Bấm để thử tìm user này">
                        <span>#<?= $u['id'] ?> <strong><?= htmlspecialchars($u['name']) ?></strong></span>
                        <small>👉 Thử</small>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- 2. KHU VỰC TÌM KIẾM & THANH NĂNG LƯỢNG SAI SỐ -->
        <div class="search-card">
            <div class="mode-selector">
                <span style="font-size: 14px; font-weight: 600; align-self: center;">Chế độ xem:</span>
                <a href="user_list.php?mode=compare&fuzziness=<?= $fuzziness ?>&q=<?= urlencode($keyword) ?>" class="mode-btn <?= $mode === 'compare' ? 'active' : '' ?>">⚔️ So sánh song song (2 cột)</a>
                <a href="user_list.php?mode=sql&fuzziness=<?= $fuzziness ?>&q=<?= urlencode($keyword) ?>" class="mode-btn <?= $mode === 'sql' ? 'active' : '' ?>">🔴 Chỉ xem Phần 1 (SQL LIKE)</a>
                <a href="user_list.php?mode=es&fuzziness=<?= $fuzziness ?>&q=<?= urlencode($keyword) ?>" class="mode-btn <?= $mode === 'es' ? 'active' : '' ?>">🟢 Chỉ xem Phần 2 (Elasticsearch)</a>
            </div>

            <form method="GET" class="search-form">
                <input type="hidden" name="mode" value="<?= htmlspecialchars($mode) ?>">
                <input type="hidden" name="fuzziness" value="<?= htmlspecialchars($fuzziness) ?>">
                <input type="text" name="q" placeholder="Nhập tên user cần tìm kiếm (ví dụ: Messi, Mesi, cr, Ranoldo, Bellingham...)" value="<?= htmlspecialchars($keyword) ?>" autofocus>
                <button type="submit">🔍 Tìm kiếm</button>
                <a href="user_list.php?mode=<?= $mode ?>&fuzziness=<?= $fuzziness ?>" class="btn-reset">Đặt lại</a>
            </form>

            <!-- THANH NĂNG LƯỢNG ĐIỀU CHỈNH ĐỘ SAI SỐ ELASTICSEARCH -->
            <div class="energy-section">
                <div class="energy-header">
                    <span class="energy-title">
                        ⚡ THANH NĂNG LƯỢNG ĐIỀU CHỈNH ĐỘ SAI SỐ (FUZZINESS):
                    </span>
                    <span class="energy-badge <?= 'fuzz-' . strtolower($fuzziness) ?>">
                        Đang chọn: 
                        <?php
                            if ($fuzziness === '0') echo "Mức 0 (Sai số = 0: Khắt khe 100%)";
                            elseif ($fuzziness === '1') echo "Mức 1 (Cho phép sai tối đa 1 ký tự)";
                            elseif ($fuzziness === '2') echo "Mức 2 (Cho phép sai tối đa 2 ký tự - Cực đại)";
                            else echo "Mức AUTO (Tự động tính theo độ dài từ)";
                        ?>
                    </span>
                </div>

                <!-- Thanh đo năng lượng -->
                <div class="energy-bar-container">
                    <div class="energy-bar-fill <?= 'fill-' . strtolower($fuzziness) ?>"></div>
                </div>

                <!-- 4 mức điều chỉnh năng lượng -->
                <div class="energy-buttons">
                    <a href="user_list.php?mode=<?= $mode ?>&fuzziness=0&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '0' ? 'active' : '' ?>">
                        🔴 Mức 0 (0% Sai số)
                        <span class="energy-desc">Chính xác 100%. Gõ "Mesi" sẽ ra 0 kết quả!</span>
                    </a>
                    <a href="user_list.php?mode=<?= $mode ?>&fuzziness=1&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '1' ? 'active' : '' ?>">
                        🟡 Mức 1 (50% Sai số)
                        <span class="energy-desc">Sai số 1 chữ. Gõ "Mesi" $\rightarrow$ ra "Messi"!</span>
                    </a>
                    <a href="user_list.php?mode=<?= $mode ?>&fuzziness=2&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '2' ? 'active' : '' ?>">
                        🟢 Mức 2 (100% Năng lượng)
                        <span class="energy-desc">Sai số 2 chữ. Gõ "Ranoldo" $\rightarrow$ ra "Ronaldo"!</span>
                    </a>
                    <a href="user_list.php?mode=<?= $mode ?>&fuzziness=AUTO&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === 'AUTO' ? 'active' : '' ?>">
                        ⚡ Mức AUTO
                        <span class="energy-desc">Tự động điều chỉnh theo chuẩn Elasticsearch</span>
                    </a>
                </div>
            </div>
        </div>

        <?php if ($keyword !== ''): ?>
            <div class="banner-highlight">
                💡 <strong>Kết quả từ khóa: "<?= htmlspecialchars($keyword) ?>"</strong> với mức sai số Fuzziness = <strong><?= htmlspecialchars($fuzziness) ?></strong><br>
                - <strong>SQL LIKE:</strong> <?= count($sqlUsers) > 0 ? "Tìm thấy " . count($sqlUsers) . " người." : "❌ 0 kết quả (SQL không thể tìm khi gõ sai)." ?><br>
                - <strong>Elasticsearch:</strong> <?= count($esUsers) > 0 ? "✅ Tìm thấy " . count($esUsers) . " người tương ứng." : "❌ 0 kết quả (Mức sai số hiện tại không đủ bao phủ từ khóa này)." ?>
            </div>
        <?php endif; ?>

        <!-- 3. BẢNG HIỂN THỊ KẾT QUẢ SO SÁNH -->
        <div class="<?= $mode === 'compare' ? 'grid-2' : '' ?>">

            <?php if ($mode === 'sql' || $mode === 'compare'): ?>
            <!-- CỘT 1: SQL LIKE -->
            <div class="column-card">
                <div class="col-header">
                    <span class="col-title">Phần 1 — SQL LIKE</span>
                    <span class="badge-red">Ứng dụng hiện tại</span>
                </div>

                <div class="query-info">
                    SELECT * FROM users WHERE name LIKE '%<?= htmlspecialchars($keyword) ?>%';
                    <div class="time-tag">Thời gian: <?= $sqlTime ?> ms | Tìm thấy: <?= count($sqlUsers) ?> / <?= count($allUsers) ?> users</div>
                </div>

                <?php if (count($sqlUsers) > 0): ?>
                    <table>
                        <thead>
                            <tr><th style="width: 40px;">ID</th><th>Tên User</th><th>Email</th></tr>
                        </thead>
                        <tbody>
                            <?php foreach ($sqlUsers as $u): ?>
                                <tr>
                                    <td><?= $u['id'] ?></td>
                                    <td><strong><?= htmlspecialchars($u['name']) ?></strong></td>
                                    <td style="color: #64748b;"><?= htmlspecialchars($u['email']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-box empty-red">
                        <strong style="font-size: 16px;">❌ 0 kết quả tìm thấy</strong>
                        <p style="margin: 8px 0 0 0; font-size: 13px;">
                            SQL <code>LIKE '%<?= htmlspecialchars($keyword) ?>%'</code> không có cơ chế bù trừ sai số.
                        </p>
                    </div>
                <?php endif; ?>
            </div>
            <?php endif; ?>

            <?php if ($mode === 'es' || $mode === 'compare'): ?>
            <!-- CỘT 2: ELASTICSEARCH -->
            <div class="column-card">
                <div class="col-header">
                    <span class="col-title">Phần 2 — Elasticsearch</span>
                    <span class="badge-green">fuzziness: <?= htmlspecialchars($fuzziness) ?></span>
                </div>

                <?php if ($esError): ?>
                    <div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 12px;">
                        <?= htmlspecialchars($esError) ?>
                    </div>
                <?php else: ?>
                    <div class="query-info" style="color: #4ade80;">
                        match(fuzziness: <?= htmlspecialchars($fuzziness) ?>)
                        <div class="time-tag">Thời gian: <?= $esTime ?> ms | Tìm thấy: <?= count($esUsers) ?> / <?= count($allUsers) ?> users</div>
                    </div>
                <?php endif; ?>

                <?php if (count($esUsers) > 0): ?>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">ID</th>
                                <th>Tên User</th>
                                <th>Email</th>
                                <th style="width: 70px;">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($esUsers as $u): ?>
                                <tr>
                                    <td><?= $u['id'] ?></td>
                                    <td><strong><?= htmlspecialchars($u['name']) ?></strong></td>
                                    <td style="color: #64748b;"><?= htmlspecialchars($u['email']) ?></td>
                                    <td><span class="score-tag"><?= $u['score'] ?></span></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="empty-box empty-gray">
                        <strong style="font-size: 16px;">Không tìm thấy</strong>
                        <p style="margin: 8px 0 0 0; font-size: 13px;">
                            Thử tăng "Thanh năng lượng sai số" lên Mức 1 hoặc Mức 2 để Elasticsearch mở rộng độ bù trừ sai số!
                        </p>
                    </div>
                <?php endif; ?>
            </div>
            <?php endif; ?>

        </div>
    </div>
</body>
</html>
