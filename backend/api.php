<?php
// Configuración de encabezados CORS y JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Manejo del método OPTIONS para solicitudes preflight de los navegadores (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Conexión a la base de datos
require_once 'db_config.php';

// Obtener el método de la petición HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Leer los datos JSON del cuerpo de la petición (para POST, PUT, PATCH, DELETE)
$inputData = json_decode(file_get_contents("php://input"), true) ?? [];

// Obtener el ID desde la query string (?id=X) o desde el cuerpo de la petición
$id = isset($_GET['id']) ? intval($_GET['id']) : (isset($inputData['id']) ? intval($inputData['id']) : null);

try {
    switch ($method) {
        
        // -------------------------------------------------------------
        // 1. GET: Obtener todos los registros o uno en específico por ID
        // -------------------------------------------------------------
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $data = $stmt->fetch();

                if ($data) {
                    http_response_code(200);
                    echo json_encode(["status" => "success", "data" => $data]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Registro no encontrado."]);
                }
            } else {
                $stmt = $conn->prepare("SELECT * FROM products ORDER BY id DESC");
                $stmt->execute();
                $data = $stmt->fetchAll();

                http_response_code(200);
                echo json_encode(["status" => "success", "total" => count($data), "data" => $data]);
            }
            break;

        // -------------------------------------------------------------
        // 2. POST: Crear un nuevo registro
        // -------------------------------------------------------------
        case 'POST':
            if (empty($inputData['name']) || !isset($inputData['price'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Los campos 'name' y 'price' son obligatorios."]);
                exit();
            }

            $name = trim($inputData['name']);
            $description = isset($inputData['description']) ? trim($inputData['description']) : '';
            $price = floatval($inputData['price']);
            $stock = isset($inputData['stock']) ? intval($inputData['stock']) : 0;

            $stmt = $conn->prepare("INSERT INTO products (name, description, price, stock) VALUES (:name, :description, :price, :stock)");
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':price', $price);
            $stmt->bindParam(':stock', $stock, PDO::PARAM_INT);

            if ($stmt->execute()) {
                $newId = $conn->lastInsertId();
                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Registro creado exitosamente.",
                    "id" => $newId
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "No se pudo crear el registro."]);
            }
            break;

        // -------------------------------------------------------------
        // 3. PUT: Actualización completa de un registro por ID
        // -------------------------------------------------------------
        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "El ID es obligatorio para actualizar mediante PUT."]);
                exit();
            }

            if (empty($inputData['name']) || !isset($inputData['price'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Se requieren todos los campos obligatorios ('name' y 'price') para PUT."]);
                exit();
            }

            $name = trim($inputData['name']);
            $description = isset($inputData['description']) ? trim($inputData['description']) : '';
            $price = floatval($inputData['price']);
            $stock = isset($inputData['stock']) ? intval($inputData['stock']) : 0;

            $stmt = $conn->prepare("UPDATE products SET name = :name, description = :description, price = :price, stock = :stock WHERE id = :id");
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':price', $price);
            $stmt->bindParam(':stock', $stock, PDO::PARAM_INT);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            $stmt->execute();

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "message" => "Registro actualizado completamente (PUT) exitosamente."
            ]);
            break;

        // -------------------------------------------------------------
        // 4. PATCH: Actualización parcial de un registro por ID
        // -------------------------------------------------------------
        case 'PATCH':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "El ID es obligatorio para actualizar mediante PATCH."]);
                exit();
            }

            $fieldsToUpdate = [];
            $params = [':id' => $id];

            if (isset($inputData['name'])) {
                $fieldsToUpdate[] = "name = :name";
                $params[':name'] = trim($inputData['name']);
            }
            if (isset($inputData['description'])) {
                $fieldsToUpdate[] = "description = :description";
                $params[':description'] = trim($inputData['description']);
            }
            if (isset($inputData['price'])) {
                $fieldsToUpdate[] = "price = :price";
                $params[':price'] = floatval($inputData['price']);
            }
            if (isset($inputData['stock'])) {
                $fieldsToUpdate[] = "stock = :stock";
                $params[':stock'] = intval($inputData['stock']);
            }

            if (empty($fieldsToUpdate)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "No se enviaron campos válidos para actualizar."]);
                exit();
            }

            $sql = "UPDATE products SET " . implode(", ", $fieldsToUpdate) . " WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);

            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "message" => "Registro actualizado parcialmente (PATCH) exitosamente."
            ]);
            break;

        // -------------------------------------------------------------
        // 5. DELETE: Eliminar un registro por ID
        // -------------------------------------------------------------
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "El ID es obligatorio para eliminar un registro."]);
                exit();
            }

            $stmt = $conn->prepare("DELETE FROM products WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "Registro eliminado exitosamente."
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "No se encontró el registro a eliminar."]);
            }
            break;

        // -------------------------------------------------------------
        // Método no soportado
        // -------------------------------------------------------------
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
?>
