<?php
require_once 'db_config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'umas';
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

// Construir la URL base de las imágenes respetando el puerto de Apache (8080)
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST']; // Ya incluye :8080 si se accedió por ese puerto
$baseImageUrl = "$protocol://$host/backend/public/images/";

try {
    switch ($method) {
        case 'GET':
            if ($action === 'compatibility') {
                // Obtener afinidades de herencia
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Se requiere el parámetro 'id' de la Uma."]);
                    exit();
                }

                $stmt = $conn->prepare("
                    SELECT 
                        u.id, 
                        u.nombre, 
                        CONCAT(:base_url, u.imagen_url) AS imagen_url, 
                        h.puntos_compatibilidad
                    FROM afinidad_herencia h
                    JOIN umas u ON h.uma_objetivo_id = u.id
                    WHERE h.uma_origen_id = :id
                    ORDER BY h.puntos_compatibilidad DESC
                ");
                $stmt->bindParam(':base_url', $baseImageUrl);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $data = $stmt->fetchAll();

                http_response_code(200);
                echo json_encode(["status" => "success", "data" => $data]);
                break;
            }

            // Consultar Umas (una sola o listado completo)
            if ($id) {
                $stmt = $conn->prepare("
                    SELECT u.*, a.turf, a.dirt, a.dist_short, a.dist_mile, a.dist_medium, a.dist_long,
                           a.strat_front, a.strat_leader, a.strat_betweener, a.strat_chaser
                    FROM umas u
                    LEFT JOIN aptitudes a ON u.id = a.uma_id
                    WHERE u.id = :id LIMIT 1
                ");
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $row = $stmt->fetch();

                if ($row) {
                    http_response_code(200);
                    echo json_encode(["status" => "success", "data" => formatUma($row, $baseImageUrl)]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Uma no encontrada."]);
                }
            } else {
                $stmt = $conn->prepare("
                    SELECT u.*, a.turf, a.dirt, a.dist_short, a.dist_mile, a.dist_medium, a.dist_long,
                           a.strat_front, a.strat_leader, a.strat_betweener, a.strat_chaser
                    FROM umas u
                    LEFT JOIN aptitudes a ON u.id = a.uma_id
                    ORDER BY u.id ASC
                ");
                $stmt->execute();
                $rows = $stmt->fetchAll();
                $formatted = array_map(fn($r) => formatUma($r, $baseImageUrl), $rows);

                http_response_code(200);
                echo json_encode(["status" => "success", "total" => count($formatted), "data" => $formatted]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Método HTTP no permitido."]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error interno en el servidor: " . $e->getMessage()
    ]);
}

function formatUma($r, $baseImageUrl) {
    $img = $r['imagen_url'] ?? '';
    if (!empty($img) && !str_starts_with($img, 'http://') && !str_starts_with($img, 'https://')) {
        if (str_starts_with($img, 'public/images/')) {
            $img = substr($img, strlen('public/images/'));
        }
        $img = $baseImageUrl . ltrim($img, '/');
    }

    return [
        'id' => intval($r['id']),
        'name' => $r['nombre'],
        'rarity' => intval($r['rareza_base']),
        'imageUrl' => $img,
        'baseStats' => [
            'speed'   => intval($r['base_speed']),
            'stamina' => intval($r['base_stamina']),
            'power'   => intval($r['base_power']),
            'guts'    => intval($r['base_guts']),
            'wit'     => intval($r['base_wit'])
        ],
        'growthRates' => [
            'speed'   => intval($r['growth_speed']),
            'stamina' => intval($r['growth_stamina']),
            'power'   => intval($r['growth_power']),
            'guts'    => intval($r['growth_guts']),
            'wit'     => intval($r['growth_wit'])
        ],
        'aptitudes' => [
            'turf'      => $r['turf'] ?? 'G',
            'dirt'      => $r['dirt'] ?? 'G',
            'short'     => $r['dist_short'] ?? 'G',
            'mile'      => $r['dist_mile'] ?? 'G',
            'medium'    => $r['dist_medium'] ?? 'G',
            'long'      => $r['dist_long'] ?? 'G',
            'front'     => $r['strat_front'] ?? 'G',
            'leader'    => $r['strat_leader'] ?? 'G',
            'betweener' => $r['strat_betweener'] ?? 'G',
            'chaser'    => $r['strat_chaser'] ?? 'G'
        ]
    ];
}
?>