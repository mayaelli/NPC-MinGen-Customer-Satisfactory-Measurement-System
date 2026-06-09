<?php
/**
 * manage_services.php — ARTA Services CRUD Endpoint
 *
 * Handles all operations on the arta_services table.
 *
 * GET    ?user_id={id}           → active services (is_active = 1), scoped by role
 * GET    ?user_id={id}&archived=1 → archived services (is_active = 0)
 * POST                           → create new service
 * PUT    { id, ...fields }       → update service name/type/description
 * PUT    { id, restore: true }   → restore an archived service (set is_active = 1)
 * DELETE ?id={id}                → soft-delete (set is_active = 0, NOT a real DELETE)
 *
 * IMPORTANT — Soft Delete Design:
 *   Services are NEVER hard-deleted from the database. Deleting a service row
 *   would break the LEFT JOIN in get_survey_results.php and cause service_name
 *   to appear as NULL in compliance reports for historical submissions.
 *   Instead, is_active = 0 hides the service from the manifest and survey form
 *   while keeping the row intact for report integrity.
 *   To restore: PUT { id, restore: true }
 *
 * service_type (INTERNAL / EXTERNAL) affects which column a service falls
 * into in the CSM Tabulation and Score Per Service compliance reports.
 * Changing a service's type after submissions exist will affect report output.
 */
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
$userRole             = $_SESSION['role']        ?? null;
$userOfficeId         = $_SESSION['office_id']   ?? null;
$userPermissions      = $_SESSION['permissions'] ?? [];
$resolvedUserId       = $_SESSION['user_id']     ?? null;
// Provisioned users: ALWAYS reload offices + permissions from DB.
// Session values go stale when an admin edits the user's access — never trust them for scope.
$provisionedOfficeIds = [];
if ($userRole === 'provisioned') {
    if ($resolvedUserId) {
        $oStmt = $conn->prepare("SELECT office_id FROM user_offices WHERE user_id = ?");
        $oStmt->execute([$resolvedUserId]);
        $provisionedOfficeIds = array_column($oStmt->fetchAll(PDO::FETCH_ASSOC), 'office_id');

        $pStmt = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
        $pStmt->execute([$resolvedUserId]);
        $userPermissions = array_column($pStmt->fetchAll(PDO::FETCH_ASSOC), 'permission');
    } else {
        // Fallback to session only when user_id can't be resolved
        $provisionedOfficeIds = $_SESSION['office_ids']  ?? [];
        $userPermissions      = $_SESSION['permissions'] ?? [];
    }
}

// Fallback: resolve from DB using user_id param if session is missing
if (!$userRole && isset($_GET['user_id'])) {
    $uid = intval($_GET['user_id']);
    $uStmt = $conn->prepare("SELECT u.id, u.role, u.office_id FROM users u WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $uStmt->execute([$uid]);
    $uRow = $uStmt->fetch();
    if ($uRow) {
        $userRole       = $uRow['role'];
        $userOfficeId   = $uRow['office_id'];
        $resolvedUserId = $uRow['id'];
        // For provisioned users load their permissions and assigned offices
        if ($userRole === 'provisioned') {
            $pStmt = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
            $pStmt->execute([$uRow['id']]);
            $userPermissions = array_column($pStmt->fetchAll(PDO::FETCH_ASSOC), 'permission');
            $oStmt = $conn->prepare("SELECT office_id FROM user_offices WHERE user_id = ?");
            $oStmt->execute([$uRow['id']]);
            $provisionedOfficeIds = array_column($oStmt->fetchAll(PDO::FETCH_ASSOC), 'office_id');
        }
    }
}

try {
    // --- GET BLOCK ---
    if ($method === 'GET') {
        $sql = "SELECT
                    s.id,
                    s.service_name,
                    s.service_type,
                    s.service_description,
                    s.office_id,
                    o.name as office_name,
                    o.plant_name,
                    COUNT(sub.id) as responses,
                    COUNT(sub.id) as transactions
                FROM arta_services s
                LEFT JOIN offices o ON s.office_id = o.id
                LEFT JOIN submissions sub ON s.id = sub.service_id
                WHERE s.is_active = " . (isset($_GET['archived']) ? '0' : '1');

        $params = [];

        if ($userRole === 'manager') {
            $sql .= " AND o.plant_name = :pName";
            $params = ['pName' => $_SESSION['plant_name'] ?? ''];
        } elseif ($userRole === 'office') {
            $sql .= " AND s.office_id = :offId";
            $params = ['offId' => $userOfficeId];
        } elseif ($userRole === 'provisioned') {
            if (!empty($provisionedOfficeIds)) {
                // Build named placeholders: :oid0, :oid1, …
                $placeholders = [];
                foreach ($provisionedOfficeIds as $i => $oid) {
                    $key            = "oid$i";
                    $placeholders[] = ":$key";
                    $params[$key]   = $oid;
                }
                $sql .= " AND s.office_id IN (" . implode(',', $placeholders) . ")";
            } else {
                // No offices assigned → return nothing
                $sql .= " AND 1 = 0";
            }
        }

        $sql .= " GROUP BY s.id, s.service_name, s.service_type, s.service_description, s.office_id, o.name, o.plant_name";
        $sql .= " ORDER BY o.name ASC, s.service_name ASC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;

    } elseif ($method === 'POST') {
        // Allow base roles + provisioned users with services_create permission
        $canCreate = in_array($userRole, ['super_admin', 'admin', 'office', 'manager'])
            || ($userRole === 'provisioned' && in_array('services_create', $userPermissions));

        if (!$canCreate) {
            http_response_code(403);
            exit(json_encode(["status" => "error", "message" => "Forbidden"]));
        }

        $data = json_decode(file_get_contents("php://input"));

        // Force office/manager to use their own office ID
        if (in_array($userRole, ['office', 'manager'])) {
            $data->office_id = $userOfficeId;
        } elseif ($userRole === 'provisioned') {
            // Validate that the submitted office is one of their assigned offices
            $allowed = array_map('strval', $provisionedOfficeIds);
            if (!in_array((string)($data->office_id ?? ''), $allowed)) {
                http_response_code(403);
                exit(json_encode(["status" => "error", "message" => "Cannot create a service for an office outside your scope"]));
            }
        }

        if (!empty($data->office_id) && !empty($data->service_name)) {
            $stmt = $conn->prepare("INSERT INTO arta_services (office_id, service_name, service_type, service_description) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data->office_id, strtoupper($data->service_name), strtoupper($data->service_type ?? ''), strtoupper($data->service_description ?? '')]);

            logAction($conn, $resolvedUserId, 'CREATE', 'arta_services', "Added Service: " . strtoupper($data->service_name));
            echo json_encode(["status" => "success", "message" => "Service mapped!"]);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "office_id and service_name are required."]);
        }

    } elseif ($method === 'PUT' || $method === 'DELETE') {
        // Determine required permission for the operation
        $requiredPerm = ($method === 'PUT') ? 'services_edit' : 'services_delete';

        $canModify = in_array($userRole, ['super_admin', 'admin', 'office', 'manager'])
            || ($userRole === 'provisioned' && in_array($requiredPerm, $userPermissions));

        if (!$canModify) {
            http_response_code(403);
            exit(json_encode(["status" => "error", "message" => "Forbidden"]));
        }

        $id = ($method === 'PUT') ? json_decode(file_get_contents("php://input"))->id : $_GET['id'];

        // SECURITY: restricted roles can only touch services belonging to their office(s)
        if (in_array($userRole, ['office', 'manager', 'provisioned'])) {
            $check = $conn->prepare("SELECT office_id FROM arta_services WHERE id = ?");
            $check->execute([$id]);
            $svc = $check->fetch();

            if ($userRole === 'provisioned') {
                $allowed = array_map('strval', $provisionedOfficeIds);
                if (!$svc || !in_array((string)$svc['office_id'], $allowed)) {
                    http_response_code(403);
                    exit(json_encode(["status" => "error", "message" => "Unauthorized to modify this service"]));
                }
            } else {
                if (!$svc || (string)$svc['office_id'] !== (string)$userOfficeId) {
                    http_response_code(403);
                    exit(json_encode(["status" => "error", "message" => "Unauthorized to modify this service"]));
                }
            }
        }

        if ($method === 'PUT') {
            $data = json_decode(file_get_contents("php://input"));

            // Restore archived service
            if (!empty($data->restore) && $data->restore === true) {
                $stmt = $conn->prepare("UPDATE arta_services SET is_active = 1 WHERE id = ?");
                $stmt->execute([$data->id]);
                logAction($conn, $resolvedUserId, 'UPDATE', 'arta_services', "Restored archived Service ID: " . $data->id);
                echo json_encode(["status" => "success", "message" => "Service restored to manifest."]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE arta_services SET service_name = ?, service_type = ?, service_description = ? WHERE id = ?");
            $stmt->execute([strtoupper($data->service_name), strtoupper($data->service_type ?? ''), strtoupper($data->service_description ?? ''), $data->id]);
            logAction($conn, $resolvedUserId, 'UPDATE', 'arta_services', "Updated Service ID: " . $data->id);
            echo json_encode(["status" => "success", "message" => "Service updated!"]);
        } else {
            // Soft delete: mark inactive instead of removing the row.
            // This preserves the service_name reference on all existing survey submissions.
            $stmt = $conn->prepare("UPDATE arta_services SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            logAction($conn, $resolvedUserId, 'DELETE', 'arta_services', "Soft-deleted Service ID: " . $id);
            echo json_encode(["status" => "success", "message" => "Service removed!"]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
