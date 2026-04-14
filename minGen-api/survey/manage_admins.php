<?php
// 1. SESSION & DB REQUIRE
session_start();
require_once '../config/db.php';

// 2. HEADERS
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. SECURITY: STICK TO SUPER_ADMIN ONLY
// Only the top-level Super Admin can manage other Admin accounts
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'super_admin') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Access Denied: Super Admin privileges required."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    /**
     * GET: Fetch all Administrative accounts and the Activity Logs
     */
    if ($method === 'GET') {
        // Fetch Admin Users
        $userSql = "SELECT id, username, role, is_active, admin_note, raw_password, last_login, created_at 
                    FROM users 
                    WHERE role IN ('super_admin', 'admin') 
                    ORDER BY role DESC, username ASC";
        $users = $conn->query($userSql)->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Recent Logs (Limit to 50 for performance)
        $logSql = "SELECT l.*, u.username 
                   FROM activity_logs l 
                   JOIN users u ON l.user_id = u.id 
                   ORDER BY l.created_at DESC LIMIT 50";
        $logs = $conn->query($logSql)->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success", 
            "accounts" => $users,
            "logs" => $logs
        ]);
    }

    /**
     * POST: Create a new Admin account
     */
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));

        if (!empty($data->username) && !empty($data->admin_note)) {
            // Generate a secure but readable temporary password
            // Example: ADM-5281-MG
            $tempPass = "ADM-" . rand(1000, 9999) . "-" . strtoupper(substr($data->username, 0, 2));
            $hashedPass = password_hash($tempPass, PASSWORD_DEFAULT);

            $stmt = $conn->prepare("INSERT INTO users (username, password, raw_password, role, admin_note, is_active) VALUES (?, ?, ?, 'admin', ?, 1)");
            $stmt->execute([
                $data->username,
                $hashedPass,
                $tempPass,
                $data->admin_note
            ]);

            // Log this creation
            logAction($conn, $_SESSION['user_id'], 'CREATE', 'users', "Created Admin account: " . $data->username);

            echo json_encode([
                "status" => "success", 
                "message" => "Admin account created!",
                "generated_password" => $tempPass
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Username and Note are required."]);
        }
    }

    /**
     * PATCH: Toggle the is_active status (Enable/Disable)
     */
    elseif ($method === 'PATCH') {
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id)) {
            throw new Exception("User ID required");
        }

        // SAFETY: Prevent the Super Admin from disabling themselves
        if ((int)$data->id === (int)$_SESSION['user_id']) {
            echo json_encode(["status" => "error", "message" => "You cannot disable your own account!"]);
            exit();
        }

        $stmt = $conn->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $stmt->execute([(int)$data->status, $data->id]);

        $statusText = $data->status ? "ENABLED" : "DISABLED";
        logAction($conn, $_SESSION['user_id'], 'UPDATE', 'users', "$statusText account ID: " . $data->id);

        echo json_encode(["status" => "success", "message" => "Account has been $statusText"]);
    }

    /**
     * DELETE: Remove an Admin account permanently
     */
    elseif ($method === 'DELETE') {
        $id = $_GET['id'];

        if ($id == $_SESSION['user_id']) {
            throw new Exception("Cannot delete yourself.");
        }

        $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND role = 'admin'");
        $stmt->execute([$id]);

        logAction($conn, $_SESSION['user_id'], 'DELETE', 'users', "Deleted Admin account ID: $id");

        echo json_encode(["status" => "success", "message" => "Account removed."]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>