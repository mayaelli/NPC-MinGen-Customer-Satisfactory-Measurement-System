<?php
session_start();
require_once '../config/db.php';

// HEADERS (Keep as is)
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
$userRole     = $_SESSION['role']     ?? null;
$userOfficeId = $_SESSION['office_id'] ?? null;

// Fallback: resolve from DB using user_id param if session is missing
if (!$userRole && isset($_GET['user_id'])) {
    $uid = intval($_GET['user_id']);
    $uStmt = $conn->prepare("SELECT u.role, u.office_id FROM users u WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $uStmt->execute([$uid]);
    $uRow = $uStmt->fetch();
    if ($uRow) {
        $userRole     = $uRow['role'];
        $userOfficeId = $uRow['office_id'];
    }
}

try {
    // --- GET BLOCK ---
    // --- UPDATED GET BLOCK WITH GROUPING ---
    if ($method === 'GET') {
        // 1. Added o.plant_name to SELECT so React can group by Plant
        $sql = "SELECT 
                    s.id,
                    s.service_name, 
                    s.service_type, 
                    s.office_id,
                    o.name as office_name,
                    o.plant_name,
                    COUNT(sub.id) as responses,
                    COUNT(sub.id) as transactions 
                FROM arta_services s
                LEFT JOIN offices o ON s.office_id = o.id
                LEFT JOIN submissions sub ON s.id = sub.service_id";
        
        $params = [];

        // 2. Logic Split: Managers see the whole Plant, Office sees one Office
        if ($userRole === 'manager') {
            $sql .= " WHERE o.plant_name = :pName";
            $params = ['pName' => $_SESSION['plant_name']]; // Ensure plant_name is in session
        } elseif ($userRole === 'office') {
            $sql .= " WHERE s.office_id = :offId";
            $params = ['offId' => $userOfficeId];
        }

        // 3. GROUP BY must include EVERY non-aggregated column
        $sql .= " GROUP BY s.id, s.service_name, s.service_type, s.office_id, o.name, o.plant_name";
        $sql .= " ORDER BY o.name ASC, s.service_name ASC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]); 
        exit;
    } elseif ($method === 'POST') {
        // Allow all 4 roles to create
        if (!in_array($userRole, ['super_admin', 'admin', 'office', 'manager'])) {
            http_response_code(403);
            exit(json_encode(["status" => "error", "message" => "Forbidden"]));
        }

        $data = json_decode(file_get_contents("php://input"));
        
        // Force office/manager to use their own ID
        if (in_array($userRole, ['office', 'manager'])) {
            $data->office_id = $userOfficeId;
        }

        if (!empty($data->office_id) && !empty($data->service_name)) {
            $stmt = $conn->prepare("INSERT INTO arta_services (office_id, service_name, service_type, service_description) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data->office_id, strtoupper($data->service_name), strtoupper($data->service_type), strtoupper($data->service_description)]);
            
            logAction($conn, $_SESSION['user_id'], 'CREATE', 'arta_services', "Added Service: " . strtoupper($data->service_name));
            echo json_encode(["status" => "success", "message" => "Service mapped!"]);
        }

    } elseif ($method === 'PUT' || $method === 'DELETE') {
        // Allow all 4 roles to modify/delete
        if (!in_array($userRole, ['super_admin', 'admin', 'office', 'manager'])) {
            http_response_code(403);
            exit(json_encode(["status" => "error", "message" => "Forbidden"]));
        }

        $id = ($method === 'PUT') ? json_decode(file_get_contents("php://input"))->id : $_GET['id'];

        // SECURITY: 'office' and 'manager' roles can only touch THEIR office's rows
        if (in_array($userRole, ['office', 'manager'])) {
            $check = $conn->prepare("SELECT office_id FROM arta_services WHERE id = ?");
            $check->execute([$id]);
            $svc = $check->fetch();
            if (!$svc || (string)$svc['office_id'] !== (string)$userOfficeId) {
                http_response_code(403);
                exit(json_encode(["status" => "error", "message" => "Unauthorized to modify this service"]));
            }
        }

        if ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));
            $stmt = $conn->prepare("UPDATE arta_services SET service_name = ?, service_type = ?, service_description = ? WHERE id = ?");
            $stmt->execute([strtoupper($data->service_name), strtoupper($data->service_type), strtoupper($data->service_description), $data->id]);
            logAction($conn, $_SESSION['user_id'], 'UPDATE', 'arta_services', "Updated Service ID: " . $data->id);
            echo json_encode(["status" => "success", "message" => "Service updated!"]);
        } else {
            $stmt = $conn->prepare("DELETE FROM arta_services WHERE id = ?");
            $stmt->execute([$id]);
            logAction($conn, $_SESSION['user_id'], 'DELETE', 'arta_services', "Deleted Service ID: " . $id);
            echo json_encode(["status" => "success", "message" => "Service removed!"]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}