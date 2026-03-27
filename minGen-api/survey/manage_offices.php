<?php
require_once '../config/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    if ($method === 'GET') {
        // Updated query to include plant_name and sort by plant
        $sql = "SELECT offices.*, users.username, users.raw_password, users.role 
                FROM offices 
                LEFT JOIN users ON offices.id = users.office_id 
                ORDER BY offices.plant_name ASC, offices.parent_id ASC";
        $stmt = $conn->query($sql);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    } 
    
    elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!empty($data->name) && !empty($data->plant_name)) {
        try {
            $conn->beginTransaction();

            // 1. Handle Hierarchy
            $parentId = (!empty($data->parent_id)) ? $data->parent_id : null;
            $role = ($parentId === null) ? 'manager' : 'office';

            // 2. Generate System Code (Short & Clean)
            // Takes first word of Plant + Random 3 digits (e.g., PUL-123)
            $plantShort = strtoupper(explode(" ", $data->plant_name)[0]);
            $finalCode = $plantShort . "-" . rand(100, 999);

            // 3. Insert Office
            $stmt = $conn->prepare("INSERT INTO offices (plant_name, name, description, parent_id, code) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data->plant_name,
                $data->name, 
                $data->description ?? '',
                $parentId,
                $finalCode
            ]);

            $officeId = $conn->lastInsertId();

            // 4. PREDICTABLE USERNAME GENERATION
            // Get first word of Plant (e.g., "Pulangi") and first word of Office (e.g., "Finance")
            $plantPrefix = strtolower(preg_replace('/[^a-zA-Z0-0]/', '', explode(" ", $data->plant_name)[0]));
            $officePrefix = strtolower(preg_replace('/[^a-zA-Z0-0]/', '', explode(" ", $data->name)[0]));

            if ($role === 'manager') {
                // e.g., pul4-manager
                $username = $plantPrefix . "-manager";
            } else {
                // e.g., pul4-finance-742
                $username = $plantPrefix . "-" . $officePrefix . "-" . rand(100, 999);
            }

            // 5. PROFESSIONAL PASSWORD GENERATION
            // format: PlantName@Csm2026 (or random if you prefer)
            $plainPassword = strtoupper($plantPrefix) . "@Csm" . rand(1000, 9999);
            $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

            // 6. Insert into Users Table
            $stmtUser = $conn->prepare("INSERT INTO users (office_id, username, password, raw_password, role) VALUES (?, ?, ?, ?, ?)");
            $stmtUser->execute([
                $officeId, 
                $username, 
                $hashedPassword, 
                $plainPassword, 
                $role
            ]);

            $conn->commit();
            echo json_encode([
                "status" => "success", 
                "message" => "Account created: $username",
                "role" => $role
            ]);

        } catch (Exception $e) {
            $conn->rollBack();
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Plant and Office names are required"]);
    }
}
    
    elseif ($method === 'DELETE') {
        $id = $_GET['id'];
        // Since we re-created the table with ON DELETE CASCADE, 
        // deleting the office will automatically delete the user record.
        $stmt = $conn->prepare("DELETE FROM offices WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(["status" => "success", "message" => "Office and associated data removed"]);
    }

    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            // Update both plant_name and office name
            $stmt = $conn->prepare("UPDATE offices SET plant_name = ?, name = ?, description = ? WHERE id = ?");
            $stmt->execute([$data->plant_name, $data->name, $data->description, $data->id]);
            echo json_encode(["status" => "success", "message" => "Office updated!"]);
        }
    }
} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}