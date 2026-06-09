<?php
/**
 * manage_provisioned_users.php — Identity Provisioning & Access Management
 *
 * Handles the full lifecycle of provisioned employee accounts.
 *
 * GET    ?user_id={id}              → list all provisioned users with their offices + permissions
 * GET    ?user_id={id}&action=logs  → stream last 30 activity_logs entries (auto-polled every 6s)
 * POST   { employee_dir_id, office_ids[], permissions[] } → create new provisioned account
 * PUT    { user_id, office_ids[], permissions[], password? } → update access scope + permissions
 * PATCH  { user_id, is_active: 0|1 } → revoke (0) or restore (1) access without deleting
 * DELETE ?id={id}                   → permanently remove account (super_admin only)
 *
 * Access gates:
 *   - super_admin: full access to all methods
 *   - provisioned with admin_provision: POST only
 *   - provisioned with admin_edit: PUT only
 *   - provisioned with admin_revoke: PATCH only
 *   - DELETE is always super_admin only — no delegation
 *
 * The __all__ sentinel (office_id = '__all__') in the frontend OfficeChipSelector
 * is resolved to real office IDs by resolveOfficeIds() before the API call.
 * The backend never sees '__all__' — it always receives an array of integer IDs.
 *
 * PATCH vs DELETE:
 *   Use PATCH (revoke) to temporarily block access while preserving the account.
 *   Use DELETE only when the employee has permanently left and their account
 *   record is no longer needed. Deleting also removes user_offices and
 *   user_permissions rows via CASCADE on the foreign keys.
 */
session_start();
require_once '../config/db.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Super admin only
$resolvedUserId = $_SESSION['user_id'] ?? null;
$resolvedRole   = $_SESSION['role']    ?? null;
if (!$resolvedRole && isset($_GET['user_id'])) {
    $s = $conn->prepare("SELECT id, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
    $s->execute([intval($_GET['user_id'])]);
    $r = $s->fetch();
    if ($r) { $resolvedUserId = $r['id']; $resolvedRole = $r['role']; }
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

// Method-level permission gates
$method = $_SERVER['REQUEST_METHOD'];
if ($resolvedRole !== 'super_admin') {
    if ($method === 'POST'  && !in_array('admin_provision', $resolvedPermissions)) {
        http_response_code(403); echo json_encode(["status" => "error", "message" => "Requires admin_provision permission."]); exit();
    }
    if ($method === 'PUT'   && !in_array('admin_edit',      $resolvedPermissions)) {
        http_response_code(403); echo json_encode(["status" => "error", "message" => "Requires admin_edit permission."]); exit();
    }
    if ($method === 'PATCH' && !in_array('admin_revoke',    $resolvedPermissions)) {
        http_response_code(403); echo json_encode(["status" => "error", "message" => "Requires admin_revoke permission."]); exit();
    }
    if ($method === 'DELETE') {
        http_response_code(403); echo json_encode(["status" => "error", "message" => "Only super admins can permanently delete accounts."]); exit();
    }
}

// ── Helper: attach offices + permissions to a user row ────────────────────────
function attachExtras($conn, array &$user) {
    $os = $conn->prepare(
        "SELECT uo.office_id, o.name as office_name, o.abbreviation
         FROM user_offices uo JOIN offices o ON uo.office_id = o.id
         WHERE uo.user_id = ?"
    );
    $os->execute([$user['id']]);
    $user['offices'] = $os->fetchAll();

    $ps = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
    $ps->execute([$user['id']]);
    $user['permissions'] = array_column($ps->fetchAll(), 'permission');
}

try {
    // ── GET: list provisioned users OR stream activity logs ───────────────────
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'users';

        // Stream system activity logs
        if ($action === 'logs') {
            try {
                $q = $conn->query(
                    "SELECT l.id, l.action_type, l.action_details, l.created_at,
                            COALESCE(u.username, 'System') as username
                     FROM activity_logs l
                     LEFT JOIN users u ON l.user_id = u.id
                     ORDER BY l.id DESC LIMIT 30"
                );
                echo json_encode(["status" => "success", "data" => $q->fetchAll()]);
            } catch (Exception $e) {
                // Graceful fallback — don't crash the page if logs table schema differs
                echo json_encode(["status" => "success", "data" => []]);
            }
            exit();
        }

        // Default: list all provisioned users
        // username in users = the employee's email (used as login credential)
        $stmt = $conn->query(
            "SELECT u.id, u.username as email, u.raw_password, u.is_active, u.last_login, u.created_at, u.employee_id,
                    e.name, e.position, e.department, e.employee_id as dir_employee_id
             FROM users u
             LEFT JOIN employee_directory e ON u.employee_id = e.id
             WHERE u.is_provisioned = 1
             ORDER BY u.created_at DESC"
        );
        $users = $stmt->fetchAll();

        foreach ($users as &$user) { attachExtras($conn, $user); }

        echo json_encode(["status" => "success", "data" => $users]);
    }

    // ── POST: provision a new employee ────────────────────────────────────────
    elseif ($method === 'POST') {
        $d = json_decode(file_get_contents("php://input"));

        if (empty($d->employee_dir_id) || empty($d->office_ids) || !is_array($d->office_ids)) {
            echo json_encode(["status" => "error",
                "message" => "employee_dir_id and at least one office are required."]);
            exit();
        }

        // Fetch employee from directory
        $empStmt = $conn->prepare("SELECT * FROM employee_directory WHERE id = ? LIMIT 1");
        $empStmt->execute([$d->employee_dir_id]);
        $emp = $empStmt->fetch();
        if (!$emp) {
            echo json_encode(["status" => "error", "message" => "Employee not found in directory."]);
            exit();
        }
        if (empty($emp['password'])) {
            echo json_encode(["status" => "error",
                "message" => "No password on record for this employee. Re-import the CSV with the password column filled."]);
            exit();
        }

        // Guard: already provisioned?
        $dupStmt = $conn->prepare("SELECT id FROM users WHERE employee_id = ? LIMIT 1");
        $dupStmt->execute([$emp['id']]);
        if ($dupStmt->fetch()) {
            echo json_encode(["status" => "error",
                "message" => "This employee already has a system account."]);
            exit();
        }

        $conn->beginTransaction();

        // username = email (login credential); hash the plain-text password from the directory
        $rawPass = $emp['password'];
        $hashed  = password_hash($rawPass, PASSWORD_DEFAULT);
        $conn->prepare(
            "INSERT INTO users (username, password, raw_password, role, is_active, is_provisioned, employee_id)
             VALUES (?, ?, ?, 'provisioned', 1, 1, ?)"
        )->execute([$emp['email'], $hashed, $rawPass, $emp['id']]);
        $newUserId = $conn->lastInsertId();

        // Assign offices
        $officeStmt = $conn->prepare("INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)");
        foreach ($d->office_ids as $oid) {
            $officeStmt->execute([$newUserId, intval($oid)]);
        }

        // Assign permissions
        if (!empty($d->permissions) && is_array($d->permissions)) {
            $permStmt = $conn->prepare(
                "INSERT IGNORE INTO user_permissions (user_id, permission) VALUES (?, ?)"
            );
            foreach ($d->permissions as $perm) {
                $permStmt->execute([$newUserId, $perm]);
            }
        }

        $conn->commit();

        logAction($conn, $resolvedUserId, 'CREATE', 'users',
            "Provisioned employee: " . $emp['name'] . " (user_id: $newUserId)");

        echo json_encode(["status" => "success",
            "message" => $emp['name'] . " has been granted system access."]);
    }

    // ── PUT: update offices and permissions ───────────────────────────────────
    elseif ($method === 'PUT') {
        $d = json_decode(file_get_contents("php://input"));

        if (empty($d->user_id)) {
            echo json_encode(["status" => "error", "message" => "user_id is required."]);
            exit();
        }

        $conn->beginTransaction();

        // Replace offices
        $conn->prepare("DELETE FROM user_offices WHERE user_id = ?")->execute([$d->user_id]);
        if (!empty($d->office_ids) && is_array($d->office_ids)) {
            $officeStmt = $conn->prepare("INSERT INTO user_offices (user_id, office_id) VALUES (?, ?)");
            foreach ($d->office_ids as $oid) {
                $officeStmt->execute([$d->user_id, intval($oid)]);
            }
        }

        // Replace permissions
        $conn->prepare("DELETE FROM user_permissions WHERE user_id = ?")->execute([$d->user_id]);
        if (!empty($d->permissions) && is_array($d->permissions)) {
            $permStmt = $conn->prepare(
                "INSERT IGNORE INTO user_permissions (user_id, permission) VALUES (?, ?)"
            );
            foreach ($d->permissions as $perm) {
                $permStmt->execute([$d->user_id, $perm]);
            }
        }

        // Optional password reset
        if (!empty($d->password)) {
            $conn->prepare("UPDATE users SET password = ?, raw_password = ? WHERE id = ?")
                 ->execute([password_hash($d->password, PASSWORD_DEFAULT), $d->password, $d->user_id]);
        }

        $conn->commit();

        logAction($conn, $resolvedUserId, 'UPDATE', 'users',
            "Updated provisioned user ID: " . $d->user_id);

        echo json_encode(["status" => "success", "message" => "Access updated successfully."]);
    }

    // ── PATCH: revoke or restore access ───────────────────────────────────────
    elseif ($method === 'PATCH') {
        $d = json_decode(file_get_contents("php://input"));

        if (empty($d->user_id)) {
            echo json_encode(["status" => "error", "message" => "user_id is required."]);
            exit();
        }

        $newStatus = (int)($d->is_active ?? 0);
        $conn->prepare("UPDATE users SET is_active = ? WHERE id = ? AND is_provisioned = 1")
             ->execute([$newStatus, $d->user_id]);

        $action = $newStatus ? "RESTORED" : "REVOKED";
        logAction($conn, $resolvedUserId, 'UPDATE', 'users',
            "$action provisioned user ID: " . $d->user_id);

        echo json_encode(["status" => "success",
            "message" => "Access " . strtolower($action) . " successfully."]);
    }

    // ── DELETE: permanently remove provisioned user ───────────────────────────
    elseif ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(["status" => "error", "message" => "id required."]);
            exit();
        }

        $conn->prepare("DELETE FROM users WHERE id = ? AND is_provisioned = 1")->execute([$id]);

        logAction($conn, $resolvedUserId, 'DELETE', 'users',
            "Permanently deleted provisioned user ID: $id");

        echo json_encode(["status" => "success", "message" => "Account permanently removed."]);
    }

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
