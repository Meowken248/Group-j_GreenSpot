<?php
// user_list_sql.php - Phần 1: Tìm kiếm bằng SQL LIKE
$dbFile = __DIR__ . '/users.db';
$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Lấy danh sách toàn bộ users
$allUsers = $pdo->query("SELECT * FROM users ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

$keyword = isset($_GET['q']) ? trim($_GET['q']) : '';
$users = [];
$executionTimeMs = 0;

$startTime = microtime(true);
if ($keyword !== '') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE name LIKE :keyword COLLATE NOCASE");
    $stmt->execute(['keyword' => '%' . $keyword . '%']);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    $users = $allUsers;
}
$executionTimeMs = round((microtime(true) - $startTime) * 1000, 2);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phần 1 - Tìm kiếm User với SQL LIKE</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 30px; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .nav-links { margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 15px; }
        .nav-links a { text-decoration: none; color: #64748b; font-weight: 500; font-size: 14px; }
        .nav-links a.active { color: #dc2626; font-weight: bold; border-bottom: 2px solid #dc2626; padding-bottom: 4px; }
        h1 { margin-top: 0; font-size: 22px; color: #0f172a; }
        .badge-sql { background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; display: inline-block; }

        .all-users-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
        .all-users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 10px; }
        .user-chip { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; display: flex; justify-content: space-between; text-decoration: none; color: #0f172a; }
        .user-chip:hover { border-color: #dc2626; background: #fff1f2; }

        .search-box { display: flex; gap: 10px; margin: 20px 0; }
        input[type="text"] { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; }
        button { background: #2563eb; color: #fff; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        button:hover { background: #1d4ed8; }
        .reset-btn { background: #64748b; text-decoration: none; color: #fff; padding: 12px 18px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; color: #475569; }
        .empty-state { text-align: center; padding: 35px 20px; color: #dc2626; background: #fef2f2; border-radius: 8px; margin-top: 15px; }
        .sql-preview { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 15px 0; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav-links">
            <a href="user_list.php">🔄 Bảng so sánh 2 chế độ</a>
            <a href="user_list_sql.php" class="active">📍 Phần 1: SQL LIKE</a>
            <a href="user_list_es.php">⚡ Phần 2: Elasticsearch</a>
        </div>

        <h1>TÌM KIẾM USER VỚI ELASTICSEARCH</h1>
        <p><span class="badge-sql">PHẦN 1: ỨNG DỤNG HIỆN TẠI (SQL LIKE)</span></p>

        <!-- DANH SÁCH TẤT CẢ 18 USERS -->
        <div class="all-users-box">
            <strong style="font-size: 14px;">📋 Danh sách tất cả Users đang có trong hệ thống (<?= count($allUsers) ?> người):</strong>
            <div class="all-users-grid">
                <?php foreach ($allUsers as $u): ?>
                    <a href="user_list_sql.php?q=<?= urlencode($u['name']) ?>" class="user-chip">
                        <span>#<?= $u['id'] ?> <strong><?= htmlspecialchars($u['name']) ?></strong></span>
                        <span style="color: #dc2626; font-size: 11px;">👉 Thử</span>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>

        <form method="GET" class="search-box">
            <input type="text" name="q" placeholder="Nhập tên user cần tìm kiếm..." value="<?= htmlspecialchars($keyword) ?>" autofocus>
            <button type="submit">Tìm kiếm SQL</button>
            <a href="user_list_sql.php" class="reset-btn">Đặt lại</a>
        </form>

        <?php if ($keyword !== ''): ?>
            <div class="sql-preview">
                SELECT * FROM users WHERE name LIKE '%<?= htmlspecialchars($keyword) ?>%';
                <div style="color: #94a3b8; margin-top: 4px; font-size: 12px;">Thời gian xử lý: <?= $executionTimeMs ?> ms | Tìm thấy: <?= count($users) ?> kết quả</div>
            </div>
        <?php endif; ?>

        <?php if (count($users) > 0): ?>
            <table>
                <thead>
                    <tr><th style="width: 60px;">ID</th><th>Tên User</th><th>Email</th></tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $u): ?>
                        <tr>
                            <td><?= $u['id'] ?></td>
                            <td><strong><?= htmlspecialchars($u['name']) ?></strong></td>
                            <td style="color: #64748b;"><?= htmlspecialchars($u['email']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <div class="empty-state">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 6px;">❌ 0 kết quả tìm thấy cho: "<?= htmlspecialchars($keyword) ?>"</div>
                <div style="font-size: 13px; color: #7f1d1d;">
                    SQL <code>LIKE</code> không thể tìm được khi gõ sai hoặc thiếu ký tự.
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
