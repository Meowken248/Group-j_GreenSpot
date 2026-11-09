<?php
// setup_db_and_sync.php - Khởi tạo CSDL đầy đủ và đồng bộ dữ liệu vào Elasticsearch
$dbFile = __DIR__ . '/users.db';
$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Tạo bảng users
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
)");

// Xóa dữ liệu cũ
$pdo->exec("DELETE FROM users");

// 2. Thêm danh sách mẫu phong phú (18 cầu thủ nổi tiếng)
$sampleUsers = [
    ['name' => 'Lionel Messi', 'email' => 'messi@gmail.com'],
    ['name' => 'Cristiano Ronaldo', 'email' => 'ronaldo@gmail.com'],
    ['name' => 'Kylian Mbappe', 'email' => 'mbappe@gmail.com'],
    ['name' => 'Neymar Jr', 'email' => 'neymar@gmail.com'],
    ['name' => 'Erling Haaland', 'email' => 'haaland@gmail.com'],
    ['name' => 'Kevin De Bruyne', 'email' => 'debruyne@gmail.com'],
    ['name' => 'Luka Modric', 'email' => 'modric@gmail.com'],
    ['name' => 'Karim Benzema', 'email' => 'benzema@gmail.com'],
    ['name' => 'Mohamed Salah', 'email' => 'salah@gmail.com'],
    ['name' => 'Robert Lewandowski', 'email' => 'lewandowski@gmail.com'],
    ['name' => 'Vinicius Junior', 'email' => 'vinicius@gmail.com'],
    ['name' => 'Jude Bellingham', 'email' => 'bellingham@gmail.com'],
    ['name' => 'Harry Kane', 'email' => 'kane@gmail.com'],
    ['name' => 'Son Heung-min', 'email' => 'son@gmail.com'],
    ['name' => 'Bruno Fernandes', 'email' => 'bruno@gmail.com'],
    ['name' => 'Bukayo Saka', 'email' => 'saka@gmail.com'],
    ['name' => 'Phil Foden', 'email' => 'foden@gmail.com'],
    ['name' => 'Rodri Hernandez', 'email' => 'rodri@gmail.com']
];

$stmt = $pdo->prepare("INSERT INTO users (name, email) VALUES (:name, :email)");
foreach ($sampleUsers as $u) {
    $stmt->execute(['name' => $u['name'], 'email' => $u['email']]);
}

echo "✅ Đã nạp 18 users vào CSDL SQLite (users.db)!\n";

// 3. Xóa index cũ trong Elasticsearch và tạo lại để đảm bảo sạch sẽ
$ch = curl_init("http://localhost:9200/users");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);
curl_close($ch);

// Tạo lại index users với settings chuẩn
$ch = curl_init("http://localhost:9200/users");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'mappings' => [
        'properties' => [
            'id'    => ['type' => 'integer'],
            'name'  => ['type' => 'text'],
            'email' => ['type' => 'keyword']
        ]
    ]
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_exec($ch);
curl_close($ch);

// 4. Đồng bộ tất cả users sang Elasticsearch
$users = $pdo->query("SELECT * FROM users ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
$esBaseUrl = "http://localhost:9200/users/_doc/";
$syncCount = 0;

foreach ($users as $u) {
    $url = $esBaseUrl . $u['id'];
    $data = json_encode([
        'id'    => (int)$u['id'],
        'name'  => $u['name'],
        'email' => $u['email']
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        $syncCount++;
    }
}

// Refresh index để dữ liệu tìm kiếm được ngay lập tức
$ch = curl_init("http://localhost:9200/users/_refresh");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);
curl_close($ch);

echo "🎉 Hoàn tất! Đã đồng bộ thành công {$syncCount} users sang Elasticsearch.\n";
