<?php
require_once 'db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido. Use POST."]);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true);

if (empty($input['name']) || empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Todos los campos (nombre, correo, contraseña) son requeridos."]);
    exit();
}

$name = trim($input['name']);
$email = trim($input['email']);
$password = trim($input['password']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "El formato del correo es inválido."]);
    exit();
}

try {
    // Check if email already exists
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $checkStmt->bindParam(':email', $email);
    $checkStmt->execute();

    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "El correo electrónico ya se encuentra registrado."]);
        exit();
    }

    // Hash password securely
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Insert user into DB
    $insertStmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (:name, :email, :password)");
    $insertStmt->bindParam(':name', $name);
    $insertStmt->bindParam(':email', $email);
    $insertStmt->bindParam(':password', $hashedPassword);
    $insertStmt->execute();

    $newId = $conn->lastInsertId();

    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "message" => "¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.",
        "user" => [
            "id" => $newId,
            "name" => $name,
            "email" => $email
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error al registrar el usuario: " . $e->getMessage()
    ]);
}
?>
