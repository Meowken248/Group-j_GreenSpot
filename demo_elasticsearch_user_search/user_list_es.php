<?php
// user_list_es.php - Phần 2: Tích hợp Elasticsearch Google-Grade
$dbFile = __DIR__ . '/users.db';
$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Lấy danh sách toàn bộ users để đối chiếu
$allUsers = $pdo->query("SELECT * FROM users ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

$keyword = isset($_GET['q']) ? trim($_GET['q']) : '';
$fuzziness = isset($_GET['fuzziness']) ? $_GET['fuzziness'] : 'AUTO';
if (!in_array($fuzziness, ['0', '1', '2', 'AUTO'])) {
    $fuzziness = 'AUTO';
}

$users = [];
$executionTimeMs = 0;
$esQueryJson = '';
$esError = '';

$startTime = microtime(true);
if ($keyword !== '') {
    $shouldClauses = [
        ["match_phrase" => ["name.standard" => ["query" => $keyword, "boost" => 6.0]]],
        ["match" => ["name.keyword" => ["query" => $keyword, "boost" => 8.0]]],
        ["match" => ["name" => ["query" => $keyword, "operator" => "and", "boost" => 4.0]]],
        ["match" => ["name" => ["query" => $keyword, "operator" => "or", "boost" => 2.0]]],
        ["match" => ["name.ngram" => ["query" => $keyword, "boost" => 1.5]]]
    ];

    if ($fuzziness !== '0') {
        $fuzzVal = ($fuzziness === 'AUTO') ? 'AUTO' : (int)$fuzziness;
        $shouldClauses[] = [
            "match" => [
                "name.standard" => [
                    "query" => $keyword,
                    "fuzziness" => $fuzzVal,
                    "boost" => 3.5
                ]
            ]
        ];
    }

    $esQuery = [
        "query" => [
            "bool" => [
                "should" => $shouldClauses
            ]
        ]
    ];
    $esQueryJson = json_encode($esQuery, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $ch = curl_init("http://localhost:9200/users/_search");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $esQueryJson);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        $esError = "Lỗi kết nối Elasticsearch: " . $curlErr;
    } elseif ($httpCode !== 200) {
        $esError = "Elasticsearch trả về mã lỗi HTTP: " . $httpCode . " - " . $response;
    } else {
        $data = json_decode($response, true);
        if (isset($data['hits']['hits'])) {
            foreach ($data['hits']['hits'] as $hit) {
                $users[] = [
                    'id'    => $hit['_id'],
                    'name'  => $hit['_source']['name'] ?? '',
                    'email' => $hit['_source']['email'] ?? '',
                    'score' => round($hit['_score'], 2)
                ];
            }
        }
    }
} else {
    // Nếu chưa nhập từ khóa, lấy toàn bộ user từ Elasticsearch
    $esQueryJson = '{"query": {"match_all": {}}, "size": 100}';
    $ch = curl_init("http://localhost:9200/users/_search");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $esQueryJson);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    if (isset($data['hits']['hits'])) {
        foreach ($data['hits']['hits'] as $hit) {
            $users[] = [
                'id'    => $hit['_id'],
                'name'  => $hit['_source']['name'] ?? '',
                'email' => $hit['_source']['email'] ?? '',
                'score' => '-'
            ];
        }
    }
}
$executionTimeMs = round((microtime(true) - $startTime) * 1000, 2);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phần 2 - Tích hợp Elasticsearch Google-Grade</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 30px; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-links { margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 15px; }
        .nav-links a { text-decoration: none; color: #64748b; font-weight: 500; font-size: 14px; }
        .nav-links a.active { color: #16a34a; font-weight: bold; border-bottom: 2px solid #16a34a; padding-bottom: 4px; }
        h1 { margin-top: 0; font-size: 22px; color: #0f172a; }
        .badge-es { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; display: inline-block; }
        
        /* Bảng danh sách toàn bộ users */
        .all-users-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
        .all-users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 10px; }
        .user-chip { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; display: flex; justify-content: space-between; text-decoration: none; color: #0f172a; }
        .user-chip:hover { border-color: #0284c7; background: #f0f9ff; }

        .search-box { display: flex; gap: 10px; margin: 15px 0 10px 0; }
        input[type="text"] { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; }
        button { background: #16a34a; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        button:hover { background: #15803d; }
        .reset-btn { background: #64748b; text-decoration: none; color: #fff; padding: 12px 18px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; }

        /* THANH NĂNG LƯỢNG */
        .energy-section { background: #f1f5f9; border-radius: 8px; padding: 14px 16px; margin: 14px 0 20px 0; }
        .energy-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; font-weight: 700; }
        .energy-bar-container { height: 10px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 12px; }
        .energy-bar-fill { height: 100%; transition: width 0.3s ease; }
        .fill-0 { width: 5%; background: #ef4444; }
        .fill-1 { width: 50%; background: #f59e0b; }
        .fill-2 { width: 100%; background: #10b981; }
        .fill-auto { width: 85%; background: #6366f1; }

        .energy-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .energy-btn { text-align: center; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; text-decoration: none; color: #334155; font-size: 12px; font-weight: 600; background: white; }
        .energy-btn.active { border-color: #16a34a; background: #ecfdf5; color: #15803d; font-weight: 700; box-shadow: 0 0 0 1px #16a34a; }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; color: #475569; }
        .score-pill { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .empty-state { text-align: center; padding: 35px 20px; color: #dc2626; background: #fef2f2; border-radius: 8px; margin-top: 15px; }
        .es-preview { background: #0f172a; color: #4ade80; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 15px 0; overflow-x: auto; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav-links">
            <a href="user_list.php">🔄 Bảng so sánh 2 chế độ</a>
            <a href="user_list_sql.php">📍 Phần 1: SQL LIKE</a>
            <a href="user_list_es.php" class="active">⚡ Phần 2: Elasticsearch</a>
        </div>

        <h1>TÌM KIẾM USER VỚI ELASTICSEARCH</h1>
        <p><span class="badge-es">PHẦN 2: GOOGLE-GRADE ARCHITECTURE (EDGE N-GRAM + N-GRAM + FUZZINESS)</span></p>

        <!-- 1. DANH SÁCH 18 USERS ĐANG CÓ -->
        <div class="all-users-box">
            <strong style="font-size: 14px;">📋 Danh sách tất cả Users đang có trong hệ thống (<?= count($allUsers) ?> người):</strong>
            <div class="all-users-grid">
                <?php foreach ($allUsers as $u): ?>
                    <a href="user_list_es.php?fuzziness=<?= $fuzziness ?>&q=<?= urlencode($u['name']) ?>" class="user-chip">
                        <span>#<?= $u['id'] ?> <strong><?= htmlspecialchars($u['name']) ?></strong></span>
                        <span style="color: #0284c7; font-size: 11px;">👉 Thử</span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- FORM TÌM KIẾM -->
        <form method="GET" class="search-box">
            <input type="hidden" name="fuzziness" value="<?= htmlspecialchars($fuzziness) ?>">
            <input type="text" name="q" placeholder="Thử: cris n, cr, c r, Mesi, bruyne, bappe, Ranoldo..." value="<?= htmlspecialchars($keyword) ?>" autofocus>
            <button type="submit">Tìm kiếm ES</button>
            <a href="user_list_es.php?fuzziness=<?= $fuzziness ?>" class="reset-btn">Đặt lại</a>
        </form>

        <!-- THANH NĂNG LƯỢNG SAI SỐ -->
        <div class="energy-section">
            <div class="energy-header">
                <span>⚡ THANH NĂNG LƯỢNG SAI SỐ (FUZZINESS):</span>
                <span>Mức hiện tại: <strong><?= htmlspecialchars($fuzziness) ?></strong></span>
            </div>
            <div class="energy-bar-container">
                <div class="energy-bar-fill <?= 'fill-' . strtolower($fuzziness) ?>"></div>
            </div>
            <div class="energy-buttons">
                <a href="user_list_es.php?fuzziness=0&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '0' ? 'active' : '' ?>">
                    🔴 Mức 0 (Sai số = 0)
                </a>
                <a href="user_list_es.php?fuzziness=1&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '1' ? 'active' : '' ?>">
                    🟡 Mức 1 (Sai số 1 chữ)
                </a>
                <a href="user_list_es.php?fuzziness=2&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === '2' ? 'active' : '' ?>">
                    🟢 Mức 2 (Sai số 2 chữ)
                </a>
                <a href="user_list_es.php?fuzziness=AUTO&q=<?= urlencode($keyword) ?>" class="energy-btn <?= $fuzziness === 'AUTO' ? 'active' : '' ?>">
                    ⚡ Mức AUTO
                </a>
            </div>
        </div>

        <?php if ($keyword !== ''): ?>
            <div class="es-preview">// JSON Query Google-Grade gửi sang Elasticsearch:
<?= htmlspecialchars($esQueryJson) ?>
<span style="color: #94a3b8; display: block; margin-top: 4px; font-size: 12px;">Thời gian xử lý: <?= $executionTimeMs ?> ms | Tìm thấy: <?= count($users) ?> kết quả</span></div>
        <?php endif; ?>

        <?php if (count($users) > 0): ?>
            <table>
                <thead>
                    <tr>
                        <th style="width: 60px;">ID</th>
                        <th>Tên User</th>
                        <th>Email</th>
                        <th style="width: 100px;">Điểm độ khớp (_score)</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $u): ?>
                        <tr>
                            <td><?= $u['id'] ?></td>
                            <td><strong><?= htmlspecialchars($u['name']) ?></strong></td>
                            <td style="color: #64748b;"><?= htmlspecialchars($u['email']) ?></td>
                            <td><span class="score-pill"><?= $u['score'] ?></span></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <div class="empty-state">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 6px;">Không tìm thấy user nào khớp với "<?= htmlspecialchars($keyword) ?>"</div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
