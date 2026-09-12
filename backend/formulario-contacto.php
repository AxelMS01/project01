<?php
// Configuración de encabezados CORS y JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_config.php';

// Leer datos enviados por JSON (Axios/Ionic) o por Form Data POST tradicional
$rawInput = file_get_contents("php://input");
$inputData = json_decode($rawInput, true);

if (!$inputData || !is_array($inputData)) {
    $inputData = $_POST;
}

$nombre   = isset($inputData['nombre']) ? trim($inputData['nombre']) : '';
$apellido = isset($inputData['apellido']) ? trim($inputData['apellido']) : '';
$email    = isset($inputData['email']) ? trim($inputData['email']) : '';
$mensaje  = isset($inputData['mensaje']) ? trim($inputData['mensaje']) : '';

if (empty($nombre) || empty($apellido) || empty($email) || empty($mensaje)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Todos los campos (Nombre, Apellido, Email y Mensaje) son obligatorios."
    ]);
    exit();
}

try {
    // Crear la tabla contactos si no existe
    $tableSql = "CREATE TABLE IF NOT EXISTS contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        mensaje TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $conn->exec($tableSql);

    // Insertar el mensaje
    $stmt = $conn->prepare("INSERT INTO contactos (nombre, apellido, email, mensaje) VALUES (:nombre, :apellido, :email, :mensaje)");
    $stmt->bindParam(':nombre', $nombre);
    $stmt->bindParam(':apellido', $apellido);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':mensaje', $mensaje);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode([
            "status" => "success",
            "message" => "¡Mensaje de contacto enviado con éxito!",
            "id" => $conn->lastInsertId()
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "No se pudo guardar el mensaje de contacto."
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}
?>
