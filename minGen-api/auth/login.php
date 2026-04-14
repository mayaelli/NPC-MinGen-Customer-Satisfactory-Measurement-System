<?php
// 1. Session must start before any output
session_start();

// 2. CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Credentials: true"); 
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    try {
        // --- SECURITY: RATE LIMITING (INSERTED HERE) ---
        $user_ip = $_SERVER['REMOTE_ADDR'];
        $block_time = 5; // Minutes to block
        
        // Check for failed attempts in the last 15 minutes
        $limit_stmt = $conn->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = :ip AND attempt_time > DATE_SUB(NOW(), INTERVAL :minutes MINUTE)");
        $limit_stmt->execute([':ip' => $user_ip, ':minutes' => $block_time]);
        $failed_attempts = $limit_stmt->fetchColumn();

        if ($failed_attempts >= 5) {
            http_response_code(429); // Too Many Requests
            echo json_encode([
                "status" => "error", 
                "message" => "Security Lockout: Too many failed attempts. Please try again in $block_time minutes."
            ]);
            exit;
        }
        // --- END RATE LIMIT CHECK ---

        $query = "SELECT u.*, o.name as office_name, o.plant_name 
                  FROM users u 
                  LEFT JOIN offices o ON u.office_id = o.id 
                  WHERE u.username = :username LIMIT 1";

        $stmt = $conn->prepare($query);
        $stmt->execute([':username' => $data->username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            $isHashValid = password_verify($data->password, $user['password']);
            $isRawValid = ($data->password === $user['raw_password']);

            if ($isHashValid || $isRawValid) {

                if ((int)$user['is_active'] === 0) {
                    http_response_code(403); // Forbidden
                    echo json_encode([
                        "status" => "error", 
                        "message" => "This account has been deactivated. Please contact the System Administrator."
                    ]);
                    exit;
                }

                // SUCCESS: Clear old failed attempts for this IP since they logged in correctly
                $clear_stmt = $conn->prepare("DELETE FROM login_attempts WHERE ip_address = :ip");
                $clear_stmt->execute([':ip' => $user_ip]);

                $update_login = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
                $update_login->execute([':id' => $user['id']]);
                
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['username'] = $user['username']; // Added this to session for logging clarity
                $_SESSION['office_id'] = $user['office_id'];
                $_SESSION['plant_name'] = $user['plant_name'];

                logAction($conn, $user['id'], 'LOGIN', 'users', "System access granted. Session started for " . $user['username']);
                
                unset($user['password']);
                unset($user['raw_password']); // Also remove the raw password!
                
                echo json_encode([
                    "status" => "success",
                    "message" => "Login successful",
                    "user" => $user
                ]);
            } else {
                // FAILED PASSWORD: Log this attempt
                $log_stmt = $conn->prepare("INSERT INTO login_attempts (ip_address) VALUES (:ip)");
                $log_stmt->execute([':ip' => $user_ip]);

                http_response_code(401);
                echo json_encode(["status" => "error", "message" => "Invalid credentials."]);
            }
        } else {
            // USER NOT FOUND: Log this attempt too (prevents username enumeration)
            $log_stmt = $conn->prepare("INSERT INTO login_attempts (ip_address) VALUES (:ip)");
            $log_stmt->execute([':ip' => $user_ip]);

            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid credentials."]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Server error."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Username and password required."]);
}