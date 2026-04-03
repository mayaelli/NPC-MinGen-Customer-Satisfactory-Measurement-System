<?php
// 1. SESSION MUST BE FIRST
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

// 3. CAPTURE ROLE (Check if session actually exists)
$userRole     = $_SESSION['role']     ?? null;
$userOfficeId = $_SESSION['office_id'] ?? null;


try {
    if ($method === 'GET') {
        $sql = "SELECT s.*, o.name as office_name, o.plant_name 
                FROM arta_services s
                LEFT JOIN offices o ON s.office_id = o.id";
        
        // If the user is just an 'office' role, only show THEIR services
        if ($userRole === 'office') {
            $sql .= " WHERE s.office_id = :offId";
            $sql .= " ORDER BY o.name ASC";
            $stmt = $conn->prepare($sql);
            $stmt->execute(['offId' => $userOfficeId]);
        } else {
            // Super admins see everything
            $sql .= " ORDER BY o.plant_name ASC, o.name ASC";
            $stmt = $conn->query($sql);
        }
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC); 
        echo json_encode(["status" => "success", "data" => $results]); 
    } elseif ($method === 'POST') {
        // If super_admin is getting 403, it's because $userRole is null (Session lost)
        if (!in_array($userRole, ['super_admin', 'office'])) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Forbidden: Role is " . ($userRole ?? 'None')]);
            exit();
        }

        $data = json_decode(file_get_contents("php://input"));

        if ($userRole === 'office') {
            $data->office_id = $userOfficeId;
        }

        if (!empty($data->office_id) && !empty($data->service_name)) {
            $stmt = $conn->prepare("INSERT INTO arta_services (office_id, service_name) VALUES (?, ?)");
            $stmt->execute([$data->office_id, strtoupper($data->service_name)]);
            echo json_encode(["status" => "success", "message" => "Service mapped!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Missing fields"]);
        }
    } elseif ($method === 'PUT') {
        if (!in_array($userRole, ['super_admin', 'office'])) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Forbidden"]);
            exit();
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id) || empty($data->service_name)) {
            echo json_encode(["status" => "error", "message" => "Required fields missing"]);
            exit();
        }

        // office role may only edit services that belong to their own office
        if ($userRole === 'office') {
            $check = $conn->prepare("SELECT office_id FROM arta_services WHERE id = ?");
            $check->execute([$data->id]);
            $svc = $check->fetch();
            if (!$svc || (string)$svc['office_id'] !== (string)$userOfficeId) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden"]);
                exit();
            }
        }

        $stmt = $conn->prepare("UPDATE arta_services SET service_name = ? WHERE id = ?");
        $stmt->execute([strtoupper($data->service_name), $data->id]);
        echo json_encode(["status" => "success", "message" => "Service updated!"]);

    } elseif ($method === 'DELETE') {
        error_log("Role: " . $userRole . " Office: " . $userOfficeId);
        if (!in_array($userRole, ['super_admin', 'office'])) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Forbidden"]);
            exit();
        }

        if (!isset($_GET['id'])) {
            throw new Exception("ID required");
        }

        $id = $_GET['id'];

        // office role may only delete their own services
        if ($userRole === 'office') {
            $check = $conn->prepare("SELECT office_id FROM arta_services WHERE id = ?");
            $check->execute([$id]);
            $svc = $check->fetch();
            if (!$svc || (string)$svc['office_id'] !== (string)$userOfficeId) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden"]);
                exit();
            }
        }

        $stmt = $conn->prepare("DELETE FROM arta_services WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Service removed!"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}