<?php
/**
 * change_password.php — Self-Service Password Change
 *
 * POST /minGen-api/auth/change_password.php?user_id={id}
 * Body: { current_password: string, new_password: string }
 *
 * Any logged-in user (any role) can call this to change their own password.
 * It CANNOT be used to change another user's password — that is handled by
 * the reset_password flag in manage_offices.php (for office accounts) and
 * the password field in manage_provisioned_users.php PUT (for provisioned users).
 *
 * On success:
 *   - The new password is hashed with bcrypt and stored in users.password
 *   - users.raw_password is set to NULL — the user now owns their credentials
 *     and the system no longer stores a readable copy
 *
 * Minimum password length: 6 characters (enforced here and in the frontend
 * strength meter in change-password.jsx). To increase the minimum, update
 * both this file and the frontend validation in change-password.jsx.
 */
session_start();
require_once '../config/db.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Resolve user identity
$userId = $_SESSION['user_id'] ?? null;

if (!$userId && isset($_GET['user_id'])) {
    $userId = intval($_GET['user_id']);
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized. Please login."]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->current_password) || empty($data->new_password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Current and new password are required."]);
    exit();
}

if (strlen($data->new_password) < 6) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "New password must be at least 6 characters."]);
    exit();
}

try {
    // Fetch current password hash
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit();
    }

    // Verify current password
    if (!password_verify($data->current_password, $user['password'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Current password is incorrect."]);
        exit();
    }

    // Hash new password and clear raw_password (user now owns their password)
    $newHashed = password_hash($data->new_password, PASSWORD_DEFAULT);

    $update = $conn->prepare("UPDATE users SET password = ?, raw_password = NULL WHERE id = ?");
    $update->execute([$newHashed, $userId]);

    logAction($conn, $userId, 'UPDATE', 'users', "User changed their own password.");

    echo json_encode(["status" => "success", "message" => "Password changed successfully."]);

} catch (Exception $e) {
    error_log("Change password error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error."]);
}
?>
