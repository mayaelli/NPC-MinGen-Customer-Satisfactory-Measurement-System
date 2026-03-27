<?php
require_once '../config/db.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    $query = "SELECT * FROM users WHERE username = :username LIMIT 1";
    $stmt = $conn->prepare($query);
    $stmt->execute([':username' => $data->username]);
    $user = $stmt->fetch();

    // Verify password against the hash we stored
    if ($user && password_verify($data->password, $user['password'])) {
        // Don't send the password back to React!
        unset($user['password']);
        echo json_encode([
            "status" => "success",
            "message" => "Login successful",
            "user" => $user
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid username or password"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Please provide both username and password"]);
}