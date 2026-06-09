<?php
/**
 * manage_offices.php — Office Directory CRUD Endpoint
 *
 * Handles all operations on the offices table.
 *
 * GET                         → all offices with parent JOIN, ordered by plant → name
 * POST { name, plant_name }   → create new office record
 * POST { action: 'toggle_auditor', id, status } → toggle is_auditor_enabled flag
 * PUT  { id, ...fields }      → update office details (name, plant, abbreviation)
 * PUT  { id, reset_password: true } → generate new password for the linked user account
 * DELETE ?id={id}             → hard delete (removes office + cascades to linked user)
 *
 * NOTE on Auditor Toggle:
 *   When is_auditor_enabled = 1 on an office, that office's user account gains
 *   read access to all plant data — same as a manager. This is checked in
 *   get_survey_results.php before applying the RBAC WHERE clause.
 *   See the $isAuditor check in that file.
 *
 * NOTE on Password Reset:
 *   The reset generates a plain-text password in the format New{4digits}!{abbr}.
 *   It is stored as both a bcrypt hash (password) and plain text (raw_password)
 *   so the admin can read it from the Credential Terminal in office-management.jsx.
 *   Once the office user changes their password via change_password.php,
 *   raw_password is cleared and they own their credentials.
 *
 * NOTE on Delete:
 *   This is a HARD delete unlike services. Offices don't carry historical
 *   report data directly — submissions reference office_id but the office name
 *   is already stored on the submission row. Deleting an office with existing
 *   submissions will orphan those records. Use with caution.
 */
<?php
ini_set('display_errors', '0');
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
        $sql = "SELECT 
                    o.*,
                    parent.name as parent_name
                FROM offices o
                LEFT JOIN offices parent ON o.parent_id = parent.id
                ORDER BY o.plant_name ASC, o.parent_id ASC, o.name ASC";
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
            // Duplicate check — same name within the same plant (case-insensitive, trimmed)
            $dupStmt = $conn->prepare("SELECT id FROM offices WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND LOWER(TRIM(plant_name)) = LOWER(TRIM(?))");
            $dupStmt->execute([$data->name, $data->plant_name]);
            if ($dupStmt->fetch()) {
                echo json_encode([
                    "status" => "error",
                    "code"   => "DUPLICATE_NAME",
                    "message" => "\"" . $data->name . "\" already exists under " . $data->plant_name . ". Please use a different name."
                ]);
                exit();
            }

            try {
                $conn->beginTransaction();

                $parentId = (!empty($data->parent_id)) ? $data->parent_id : null;
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
                $conn->commit();

                logAction($conn, $_SESSION['user_id'] ?? null, 'CREATE', 'offices', "Created Office: " . $data->name);

                echo json_encode([
                    "status" => "success", 
                    "message" => "Office created successfully",
                    "office_id" => $officeId
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