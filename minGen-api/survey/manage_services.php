<?php
require_once '../config/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    if ($method === 'GET') {
        // Updated JOIN to include plant_name from the offices table
        $sql = "SELECT 
                    arta_services.*, 
                    offices.name as office_name, 
                    offices.plant_name 
                FROM arta_services 
                JOIN offices ON arta_services.office_id = offices.id 
                ORDER BY offices.plant_name ASC, offices.name ASC";
        
        $stmt = $conn->query($sql);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
    } 
    
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->office_id) && !empty($data->service_name)) {
            // Simplified to match the new React form structure
            $stmt = $conn->prepare("INSERT INTO arta_services (office_id, service_name) VALUES (?, ?)");
            $stmt->execute([
                $data->office_id, 
                strtoupper($data->service_name) // Keep it clean/official in all caps
            ]);
            
            echo json_encode(["status" => "success", "message" => "Service mapped successfully!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Required fields missing"]);
        }
    }

    elseif ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id) && !empty($data->service_name)) {
            $stmt = $conn->prepare("UPDATE arta_services SET service_name = ? WHERE id = ?");
            $stmt->execute([strtoupper($data->service_name), $data->id]);
            echo json_encode(["status" => "success", "message" => "Service updated!"]);
        }
    }

    elseif ($method === 'DELETE') {
        if (!isset($_GET['id'])) throw new Exception("ID required");
        
        $id = $_GET['id'];
        $stmt = $conn->prepare("DELETE FROM arta_services WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Service removed!"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}