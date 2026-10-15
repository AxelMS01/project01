<?php
// CRUD académico local. No incluye autenticación: usar datos ficticios.
require_once __DIR__ . '/db_config.php';
function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE, OPTIONS');
    respond(405, ['status' => 'error', 'message' => 'Método no permitido.']);
}
$id = null;
if (isset($_GET['id'])) {
    $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) respond(400, ['status' => 'error', 'message' => 'ID inválido.']);
}
if (in_array($method, ['PUT', 'DELETE'], true) && $id === null) {
    respond(400, ['status' => 'error', 'message' => 'Se requiere un ID.']);
}
try {
    $conn->exec("CREATE TABLE IF NOT EXISTS contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        mensaje TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if ($method === 'GET') {
        if ($id === null) {
            $rows = $conn->query('SELECT * FROM contactos ORDER BY id DESC')->fetchAll();
            respond(200, ['status' => 'success', 'data' => $rows]);
        }
        $stmt = $conn->prepare('SELECT * FROM contactos WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) respond(404, ['status' => 'error', 'message' => 'Mensaje no encontrado.']);
        respond(200, ['status' => 'success', 'data' => $row]);
    }
    $input = [];
    if ($method === 'POST' || $method === 'PUT') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $body = stripos($contentType, 'application/json') !== false
            ? json_decode(file_get_contents('php://input'), true) : $_POST;
        if (!is_array($body)) respond(400, ['status' => 'error', 'message' => 'JSON inválido.']);
        foreach (['nombre' => 100, 'apellido' => 100, 'email' => 150, 'mensaje' => 5000] as $key => $limit) {
            if (!isset($body[$key]) || !is_string($body[$key])) {
                respond(400, ['status' => 'error', 'message' => 'Todos los campos son obligatorios.']);
            }
            $value = trim($body[$key]);
            if ($value === '' || mb_strlen($value, 'UTF-8') > $limit) {
                respond(400, ['status' => 'error', 'message' => 'Campos vacíos o demasiado largos.']);
            }
            $input[$key] = $value;
        }
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            respond(400, ['status' => 'error', 'message' => 'Correo inválido.']);
        }
    }
    if ($method === 'POST') {
        $stmt = $conn->prepare('INSERT INTO contactos (nombre, apellido, email, mensaje) VALUES (:nombre, :apellido, :email, :mensaje)');
        $stmt->execute($input);
        $id = (int) $conn->lastInsertId();
    } else {
        $conn->beginTransaction();
        $stmt = $conn->prepare('SELECT id FROM contactos WHERE id = ? FOR UPDATE');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            $conn->rollBack();
            respond(404, ['status' => 'error', 'message' => 'Mensaje no encontrado.']);
        }
        if ($method === 'DELETE') {
            $stmt = $conn->prepare('DELETE FROM contactos WHERE id = ?');
            $stmt->execute([$id]);
            $conn->commit();
            respond(200, ['status' => 'success', 'data' => null, 'message' => 'Mensaje eliminado.']);
        }
        $stmt = $conn->prepare('UPDATE contactos SET nombre = :nombre, apellido = :apellido, email = :email, mensaje = :mensaje WHERE id = :id');
        $stmt->execute(array_merge($input, ['id' => $id]));
    }
    $stmt = $conn->prepare('SELECT * FROM contactos WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($conn->inTransaction()) $conn->commit();
    // Mantiene el contrato del formulario y de la cola offline existentes.
    respond($method === 'POST' ? 201 : 200, [
        'status' => 'success', 'id' => $id, 'data' => $row,
        'message' => $method === 'POST' ? 'Mensaje enviado con éxito.' : 'Mensaje actualizado.'
    ]);
} catch (PDOException $error) {
    if ($conn->inTransaction()) $conn->rollBack();
    error_log($error->getMessage());
    respond(500, ['status' => 'error', 'message' => 'No se pudo completar la operación en la base de datos.']);
}
