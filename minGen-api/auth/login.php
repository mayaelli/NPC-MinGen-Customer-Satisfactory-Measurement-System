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

        $query = "SELECT u.*, o.name as office_name, o.plant_name, ed.name as full_name
                  FROM users u
                  LEFT JOIN offices o ON u.office_id = o.id
                  LEFT JOIN employee_directory ed ON u.employee_id = ed.id
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
                
                $_SESSION['user_id']       = $user['id'];
                $_SESSION['role']          = $user['role'];
                $_SESSION['username']      = $user['username'];
                $_SESSION['office_id']     = $user['office_id'];
                $_SESSION['plant_name']    = $user['plant_name'];
                $_SESSION['is_provisioned']= (int)($user['is_provisioned'] ?? 0);
                $_SESSION['last_activity'] = time(); // idle timeout clock starts here

                // Provisioned employees: load their assigned offices + permissions
                if ($_SESSION['is_provisioned'] === 1) {
                    $offStmt = $conn->prepare(
                        "SELECT uo.office_id, o.name AS office_name, o.abbreviation
                         FROM user_offices uo JOIN offices o ON uo.office_id = o.id
                         WHERE uo.user_id = ?"
                    );
                    $offStmt->execute([$user['id']]);
                    $offRows = $offStmt->fetchAll(PDO::FETCH_ASSOC);
                    $_SESSION['office_ids'] = array_column($offRows, 'office_id');

                    $permStmt = $conn->prepare(
                        "SELECT permission FROM user_permissions WHERE user_id = ?"
                    );
                    $permStmt->execute([$user['id']]);
                    $_SESSION['permissions'] = array_column($permStmt->fetchAll(PDO::FETCH_ASSOC), 'permission');

                    // Expose to frontend so the UI can scope office dropdowns + show correct nav items
                    $user['permissions']          = $_SESSION['permissions'];
                    $user['assigned_office_ids']  = $_SESSION['office_ids'];
                    $user['assigned_offices']     = $offRows; // [{office_id, office_name, abbreviation}]
                }

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