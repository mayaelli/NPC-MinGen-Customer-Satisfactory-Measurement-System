<?php
/**
 * refresh_session.php — Session Heartbeat & Token Refresh
 *
 * GET /minGen-api/auth/refresh_session.php?user_id={id}
 * Called by admin-pages.jsx on every admin panel mount.
 *
 * Responsibilities:
 *   1. Enforce 8-hour idle timeout (IDLE_TIMEOUT constant below)
 *   2. Reset the idle timer so active users don't get logged out mid-session
 *   3. Re-fetch the latest user data from DB (catches deactivated accounts)
 *   4. For provisioned users: ALWAYS reload offices + permissions from DB.
 *      This ensures admin access changes take effect at the next page load
 *      without requiring the provisioned user to log out and back in.
 *   5. Return expires_at (milliseconds) so the frontend can do a fast
 *      client-side pre-check on next mount without a network call.
 *
 * To change the session timeout: edit the IDLE_TIMEOUT value below.
 * Current value: 8 hours (one work shift).
 *
 * Response: { status: 'success'|'expired'|'error', user: {...}, expires_at: ms }
 */
session_start();
require_once '../config/db.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// ── Idle timeout ────────────────────────────────────────────────────────────
// Session expires after this many seconds of inactivity (8 hours = one work shift).
// Change to 3600 * 24 for a 24-hour window if needed.
define('IDLE_TIMEOUT', 3600 * 8);

// Enforce idle timeout — if last_activity was set and is too old, kill the session.
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > IDLE_TIMEOUT) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(["status" => "expired", "message" => "Session expired. Please log in again."]);
    exit();
}

// Renew the idle timer on every successful check
$_SESSION['last_activity'] = time();

// ── Resolve user ─────────────────────────────────────────────────────────────
$userId = $_SESSION['user_id'] ?? null;

// Fallback: resolve from query param when session is missing
if (!$userId && isset($_GET['user_id'])) {
    $userId = intval($_GET['user_id']) ?: null;
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "No active session."]);
    exit();
}

try {
    $stmt = $conn->prepare(
        "SELECT u.*, o.name as office_name, o.plant_name, ed.name as full_name
         FROM users u
         LEFT JOIN offices o ON u.office_id = o.id
         LEFT JOIN employee_directory ed ON u.employee_id = ed.id
         WHERE u.id = ? AND u.is_active = 1 LIMIT 1"
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "User not found or deactivated."]);
        exit();
    }

    // Provisioned users: always reload offices + permissions from DB
    if ((int)$user['is_provisioned'] === 1) {
        $offStmt = $conn->prepare(
            "SELECT uo.office_id, o.name AS office_name, o.abbreviation
             FROM user_offices uo
             JOIN offices o ON uo.office_id = o.id
             WHERE uo.user_id = ?"
        );
        $offStmt->execute([$userId]);
        $offRows = $offStmt->fetchAll(PDO::FETCH_ASSOC);

        $permStmt = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
        $permStmt->execute([$userId]);
        $permissions = array_column($permStmt->fetchAll(PDO::FETCH_ASSOC), 'permission');

        $_SESSION['office_ids']  = array_column($offRows, 'office_id');
        $_SESSION['permissions'] = $permissions;

        $user['permissions']         = $permissions;
        $user['assigned_office_ids'] = $_SESSION['office_ids'];
        $user['assigned_offices']    = $offRows;
    }

    unset($user['password'], $user['raw_password']);

    // Return the expiry timestamp so the frontend can do a fast client-side pre-check
    $expiresAt = (time() + IDLE_TIMEOUT) * 1000; // JS uses milliseconds

    echo json_encode(["status" => "success", "user" => $user, "expires_at" => $expiresAt]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
