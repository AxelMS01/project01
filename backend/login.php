<?php
/**
 * POST /backend/login.php, consumido por LoginPage.onSignIn() con Axios.
 * Entrada JSON: { email, password }. Éxito 200: { status, message, user }.
 * user contiene id, name y email; nunca se devuelve el hash de la contraseña.
 * Errores: 400 campos ausentes, 401 credenciales incorrectas, 405 método, 500 BD.
 * Devuelve datos del usuario; no crea una sesión de servidor ni emite un JWT.
 */
require_once 'db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido. Use POST."]);
    exit();
}

// Axios envía application/json; el cuerpo se lee desde php://input, no desde $_POST.
$input = json_decode(file_get_contents("php://input"), true);

if (empty($input['email']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "El correo y la contraseña son obligatorios."]);
    exit();
}

$email = trim($input['email']);
$password = trim($input['password']);

try {
    $stmt = $conn->prepare("SELECT id, name, email, password FROM users WHERE email = :email LIMIT 1");
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']); // Remove hash before returning
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "¡Inicio de sesión exitoso!",
            "user" => $user
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "Correo o contraseña incorrectos."
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error en el servidor: " . $e->getMessage()
    ]);
}
?>
