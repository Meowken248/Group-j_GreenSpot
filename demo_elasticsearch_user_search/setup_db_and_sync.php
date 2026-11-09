<?php
// setup_db_and_sync.php - Khởi tạo CSDL và thiết lập Google-Grade Elasticsearch Index
$dbFile = __DIR__ . '/users.db';
$pdo = new PDO("sqlite:" . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Tạo bảng users trong SQLite
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
)");

$pdo->exec("DELETE FROM users");

// Danh sách 18 users mẫu phong phú
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
echo "✅ Đã nạp 18 users vào SQLite users.db!\n";

// 2. Xóa index users cũ trong Elasticsearch
$ch = curl_init("http://localhost:9200/users");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);
curl_close($ch);

// 3. Cấu hình Index Google-Grade với Edge N-Gram và Sub-string N-Gram
$indexConfig = [
    "settings" => [
        "index.max_ngram_diff" => 20,
        "analysis" => [
            "filter" => [
                "edge_ngram_filter" => [
                    "type" => "edge_ngram",
                    "min_gram" => 1,
                    "max_gram" => 20
                ],
                "ngram_filter" => [
                    "type" => "ngram",
                    "min_gram" => 2,
                    "max_gram" => 15
                ]
            ],
            "analyzer" => [
                "edge_ngram_analyzer" => [
                    "type" => "custom",
                    "tokenizer" => "standard",
                    "filter" => ["lowercase", "edge_ngram_filter"]
                ],
                "ngram_analyzer" => [
                    "type" => "custom",
                    "tokenizer" => "standard",
                    "filter" => ["lowercase", "ngram_filter"]
                ]
            ]
        ]
    ],
    "mappings" => [
        "properties" => [
            "id" => ["type" => "integer"],
            "name" => [
                "type" => "text",
                "analyzer" => "edge_ngram_analyzer",
                "search_analyzer" => "standard",
                "fields" => [
                    "standard" => [
                        "type" => "text",
                        "analyzer" => "standard"
                    ],
                    "ngram" => [
                        "type" => "text",
                        "analyzer" => "ngram_analyzer",
                        "search_analyzer" => "standard"
                    ],
                    "keyword" => [
                        "type" => "keyword"
                    ]
                ]
            ],
            "email" => ["type" => "keyword"]
        ]
    ]
];

$ch = curl_init("http://localhost:9200/users");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($indexConfig));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$resp = curl_exec($ch);
curl_close($ch);
echo "✅ Đã tạo Index 'users' chuẩn Google-Grade với Edge N-Gram & N-Gram!\n";

// 4. Đồng bộ 18 users sang Elasticsearch
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

// Refresh index
$ch = curl_init("http://localhost:9200/users/_refresh");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);
curl_close($ch);

echo "🎉 Hoàn tất! Đã đồng bộ thành công {$syncCount} users sang Elasticsearch.\n";
