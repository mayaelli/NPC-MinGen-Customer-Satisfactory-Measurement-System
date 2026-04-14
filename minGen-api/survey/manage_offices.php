<?php
session_start();
require_once '../config/db.php';

// 2. HEADERS
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $sql = "SELECT offices.*, offices.is_auditor_enabled, users.id as user_uid, users.username, users.raw_password, users.role, users.is_active
            FROM offices 
            LEFT JOIN users ON offices.id = users.office_id 
            ORDER BY offices.plant_name ASC, offices.parent_id ASC";
        $stmt = $conn->query($sql);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    } 
    
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        if (isset($data->action) && $data->action === 'toggle_auditor') {
            if (!empty($data->id)) {
                // Assuming you added the 'is_auditor_enabled' column to your offices table
                $stmt = $conn->prepare("UPDATE offices SET is_auditor_enabled = ? WHERE id = ?");
                $stmt->execute([$data->status, $data->id]);
                
                echo json_encode([
                    "status" => "success", 
                    "message" => "Auditor status " . ($data->status ? 'Enabled' : 'Disabled')
                ]);
                exit(); // Stop here so it doesn't run the Office Creation code below
            } else {
                echo json_encode(["status" => "error", "message" => "Office ID required"]);
                exit();
            }
        }

        if (!empty($data->name) && !empty($data->plant_name)) {
            try {
                $conn->beginTransaction();

                $parentId = (!empty($data->parent_id)) ? $data->parent_id : null;
                $role = ($parentId === null) ? 'manager' : 'office';

                // FIXED: Using object property accessor
                $abbr = !empty($data->abbreviation) ? strtoupper($data->abbreviation) : '';

                $plantShort = strtoupper(explode(" ", $data->plant_name)[0]);
                $finalCode = $plantShort . "-" . rand(100, 999);

                $stmt = $conn->prepare("INSERT INTO offices (plant_name, name, abbreviation, description, parent_id, code) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $data->plant_name,
                    $data->name, 
                    $abbr, 
                    $data->description ?? '',
                    $parentId,
                    $finalCode
                ]);

                $officeId = $conn->lastInsertId();

                // 1. Use the Abbreviation for the prefix (it's already short and unique)
                // e.g., "Agus 1/2 HEPPC" -> "agus12heppc"
                $plantPrefix = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $data->abbreviation));

                // 2. Use the first word of the Office Name
                // e.g., "Finance Office" -> "finance"
                $officePrefix = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode(" ", $data->name)[0]));

                if ($role === 'manager') {
                    // Result: agus12heppc-manager-452
                    $username = $plantPrefix . "-manager-" . rand(100, 999);
                } else {
                    // Result: agus12heppc-finance-821
                    $username = $plantPrefix . "-" . $officePrefix . "-" . rand(100, 999);
                }

                // Password stays manageable: AGUS12HEPPC@Csm4821
                $plainPassword = strtoupper($plantPrefix) . "@Csm" . rand(1000, 9999);
                $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

                $stmtUser = $conn->prepare("INSERT INTO users (office_id, username, password, raw_password, role) VALUES (?, ?, ?, ?, ?)");
                $stmtUser->execute([
                    $officeId, 
                    $username, 
                    $hashedPassword, 
                    $plainPassword, 
                    $role
                ]);

                $conn->commit();

                logAction($conn, $_SESSION['user_id'], 'CREATE', 'offices', "Created Office: " . $data->name . " with User: " . $username);

                echo json_encode([
                    "status" => "success", 
                    "message" => "Account created: $username"
                ]);

            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Plant and Office names are required"]);
        }
    }
    
    elseif ($method === 'DELETE') {
        $id = $_GET['id'];
        $stmt = $conn->prepare("DELETE FROM offices WHERE id = ?");
        $stmt->execute([$id]);

        logAction($conn, $_SESSION['user_id'], 'DELETE', 'offices', "Deleted Office ID: " . $id);
        
        echo json_encode(["status" => "success", "message" => "Data removed"]);
    }

    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->id)) {
            try {
                $conn->beginTransaction();

                // 1. Always update the Office Details
                $stmt = $conn->prepare("UPDATE offices SET plant_name = ?, name = ?, abbreviation = ?, description = ? WHERE id = ?");
                $stmt->execute([
                    $data->plant_name, 
                    $data->name, 
                    strtoupper($data->abbreviation ?? ''), 
                    $data->description ?? '', 
                    $data->id
                ]);

                $message = "Office updated successfully!";

                // 2. Check if a password reset was requested via a flag
                if (!empty($data->reset_password)) {
                    // Generate a fresh random password
                    // Example format: NEW-4821-AG (Based on abbreviation)
                    $cleanAbbr = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $data->abbreviation));
                    $newPlainPassword = "New" . rand(1000, 9999) . "!" . substr($cleanAbbr, 0, 3);
                    $newHashedPassword = password_hash($newPlainPassword, PASSWORD_DEFAULT);

                    // Update the users table linked to this office
                    $stmtUser = $conn->prepare("UPDATE users SET password = ?, raw_password = ? WHERE office_id = ?");
                    $stmtUser->execute([$newHashedPassword, $newPlainPassword, $data->id]);

                    logAction($conn, $_SESSION['user_id'], 'UPDATE', 'users', "Reset password for Office ID: " . $data->id);
                    
                    $message = "Office updated and Password reset to: $newPlainPassword";
                }

                $conn->commit();
                echo json_encode(["status" => "success", "message" => $message]);

            } catch (Exception $e) {
                if ($conn->inTransaction()) $conn->rollBack();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Missing Office ID"]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>