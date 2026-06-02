<?php
session_start();
require_once '../config/db.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}

$resolvedRole   = $_SESSION['role']    ?? null;
$resolvedUserId = $_SESSION['user_id'] ?? null;

if (!$resolvedRole && isset($_GET['user_id'])) {
    $s = $conn->prepare("SELECT id, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
    $s->execute([intval($_GET['user_id'])]);
    $r = $s->fetch();
    if ($r) { 
        $resolvedRole = $r['role']; 
        $resolvedUserId = $r['id']; 
    }
}

// Load permissions for provisioned users
$resolvedPermissions = $_SESSION['permissions'] ?? [];
if ($resolvedRole === 'provisioned' && $resolvedUserId) {
    $pStmt = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
    $pStmt->execute([$resolvedUserId]);
    $resolvedPermissions = array_column($pStmt->fetchAll(PDO::FETCH_ASSOC), 'permission');
}

$hasAnyAdminPerm = !empty(array_intersect(['admin_provision', 'admin_edit', 'admin_revoke'], $resolvedPermissions));

if ($resolvedRole !== 'super_admin' && !$hasAnyAdminPerm) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Access denied."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// logAction() is provided by db.php — do NOT redeclare it here.

try {
    if ($method === 'GET') {
        // Autocomplete dynamic endpoint logic
        // Return full employee list (for directory panel display)
        if (isset($_GET['action']) && $_GET['action'] === 'list') {
            $stmt = $conn->prepare(
                "SELECT e.id, e.name, e.email, e.position, e.department,
                        CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS is_provisioned
                 FROM employee_directory e
                 LEFT JOIN users u ON u.employee_id = e.id AND u.is_provisioned = 1
                 ORDER BY e.name ASC"
            );
            $stmt->execute();
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit();
        }

        if (isset($_GET['search'])) {
            $search = trim($_GET['search']);
            $stmt = $conn->prepare(
                "SELECT e.id, e.name, e.email, e.position, e.department,
                        CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS is_provisioned
                 FROM employee_directory e
                 LEFT JOIN users u ON u.employee_id = e.id AND u.is_provisioned = 1
                 WHERE e.name LIKE ? OR e.email LIKE ?
                 LIMIT 8"
            );
            $stmt->execute(["%$search%", "%$search%"]);
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit();
        }

        // Live telemetry dashboard metrics
        $total = $conn->query("SELECT COUNT(*) FROM employee_directory")->fetchColumn();
        $last_import = null;
        
        try {
            $log_check = $conn->query("SELECT created_at FROM activity_logs WHERE action_type = 'CREATE' ORDER BY id DESC LIMIT 1")->fetchColumn();
            if ($log_check) $last_import = $log_check;
        } catch (Exception $logEx) {
            $last_import = date('Y-m-d H:i:s');
        }

        echo json_encode([
            "status" => "success",
            "total" => intval($total),
            "last_import" => $last_import
        ]);
    }

    elseif ($method === 'POST') {
        if ($resolvedRole !== 'super_admin' && !in_array('admin_provision', $resolvedPermissions)) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Requires admin_provision permission."]);
            exit();
        }
        $data = json_decode(file_get_contents("php://input"));
        $fullName = trim($data->name ?? '');

        if (!$fullName) {
            echo json_encode(["status" => "error", "message" => "Full name is required."]);
            exit();
        }

        // Split name into parts and generate email
        // Format: {first_initial}{middle_name_initials}{last_name}@napocor.gov.ph
        // e.g. "Norvin Dennis M. Angeles" → ndmangeles@napocor.gov.ph
        $parts = preg_split('/\s+/', $fullName);
        $parts = array_values(array_filter($parts));

        if (count($parts) < 2) {
            echo json_encode(["status" => "error", "message" => "Please provide at least a first and last name."]);
            exit();
        }

        $firstName    = $parts[0];
        $lastName     = preg_replace('/[^a-zA-Z]/', '', $parts[count($parts) - 1]);
        $middleParts  = array_slice($parts, 1, -1);

        $firstInitial   = strtolower(substr($firstName, 0, 1));
        $middleInitials = implode('', array_map(fn($p) => strtolower(substr($p, 0, 1)), $middleParts));
        $lastClean      = strtolower($lastName);

        $email = $firstInitial . $middleInitials . $lastClean . '@napocor.gov.ph';

        // Reject duplicates
        $check = $conn->prepare("SELECT id FROM employee_directory WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            echo json_encode(["status" => "error", "message" => "\"$email\" already exists in the directory."]);
            exit();
        }

        // Generate a readable password: LastName[0-2] + @ + 4 random digits
        $passPrefix  = strtoupper(substr($lastName, 0, 3));
        $rawPassword = 'Npc@' . $passPrefix . rand(100, 999);

        // Auto-generate a unique employee ID
        $empId = 'NPC' . strtoupper(substr($firstName, 0, 2)) . rand(1000, 9999);

        $ins = $conn->prepare("INSERT INTO employee_directory (employee_id, name, email, password, position, department) VALUES (?, ?, ?, ?, ?, ?)");
        $ins->execute([$empId, $fullName, $email, $rawPassword, 'Staff', 'General']);

        logAction($conn, $resolvedUserId, 'CREATE', 'employee_directory', "Added employee: $fullName ($email)");

        echo json_encode([
            "status"  => "success",
            "message" => "Employee added to directory.",
            "data"    => [
                "name"        => $fullName,
                "email"       => $email,
                "password"    => $rawPassword,
                "employee_id" => $empId
            ]
        ]);
    }

    elseif ($method === 'DELETE') {
        if ($resolvedRole !== 'super_admin') {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Only super admins can purge the directory."]);
            exit();
        }
        $linked = $conn->query("SELECT COUNT(*) FROM users WHERE employee_id IS NOT NULL")->fetchColumn();
        if ($linked > 0) {
            echo json_encode([
                "status"  => "error",
                "message" => "Cannot purge directory — $linked active account node keys depend on this data source.",
            ]);
            exit();
        }
        
        $conn->exec("DELETE FROM employee_directory");
        logAction($conn, $resolvedUserId, 'DELETE', 'employee_directory', "Purged employee directory data rows.");
        echo json_encode(["status" => "success", "message" => "Directory simulation packet cleared."]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>