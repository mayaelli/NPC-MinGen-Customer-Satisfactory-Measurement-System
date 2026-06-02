<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();
require_once '../config/db.php';
header("Content-Type: application/json");

$userRole        = $_SESSION['role']        ?? null;
$userOfficeId    = $_SESSION['office_id']   ?? null;
$userPlant       = $_SESSION['plant_name']  ?? '';
$isProvisioned   = (int)($_SESSION['is_provisioned'] ?? 0);
$resolvedUserId  = $_SESSION['user_id']     ?? null;
$userOfficeIds   = [];
$userPermissions = [];

// Fallback: resolve from DB using user_id param if session is missing
if (!$userRole && isset($_GET['user_id'])) {
    $uid = intval($_GET['user_id']);
    $uStmt = $conn->prepare(
        "SELECT u.id, u.role, u.office_id, u.is_provisioned, o.plant_name
         FROM users u LEFT JOIN offices o ON u.office_id = o.id
         WHERE u.id = ? AND u.is_active = 1 LIMIT 1"
    );
    $uStmt->execute([$uid]);
    $uRow = $uStmt->fetch();
    if ($uRow) {
        $userRole       = $uRow['role'];
        $userOfficeId   = $uRow['office_id'];
        $userPlant      = $uRow['plant_name'] ?? '';
        $isProvisioned  = (int)$uRow['is_provisioned'];
        $resolvedUserId = $uRow['id'];
    }
}

// Provisioned users: always reload offices + permissions from DB.
// Session values go stale when an admin edits access — never trust them for scope.
if ($isProvisioned === 1 && $resolvedUserId) {
    $oStmt = $conn->prepare("SELECT office_id FROM user_offices WHERE user_id = ?");
    $oStmt->execute([$resolvedUserId]);
    $userOfficeIds = array_column($oStmt->fetchAll(), 'office_id');

    $pStmt = $conn->prepare("SELECT permission FROM user_permissions WHERE user_id = ?");
    $pStmt->execute([$resolvedUserId]);
    $userPermissions = array_column($pStmt->fetchAll(), 'permission');
} elseif ($isProvisioned === 1) {
    $userOfficeIds   = $_SESSION['office_ids']  ?? [];
    $userPermissions = $_SESSION['permissions'] ?? [];
}

$scope = $_GET['scope'] ?? 'local';

$where  = " WHERE 1=1 ";
$params = [];

if ($scope === 'local') {
    if ($userRole === 'manager') {
        $where   .= " AND LOWER(o.plant_name) = LOWER(?) ";
        $params[] = $userPlant;
    } elseif ($userRole === 'office') {
        $where   .= " AND s.office_id = ? ";
        $params[] = $userOfficeId;
    } elseif ($isProvisioned === 1) {
        // Provisioned: check view_analytics permission and filter by assigned offices
        if (!in_array('view_analytics', $userPermissions)) {
            echo json_encode(["status" => "error", "message" => "You do not have permission to view analytics."]);
            exit;
        }
        if (!empty($userOfficeIds)) {
            $placeholders = implode(',', array_fill(0, count($userOfficeIds), '?'));
            $where  .= " AND s.office_id IN ($placeholders) ";
            $params  = array_merge($params, $userOfficeIds);
        }
    }
}

try {
    $statsSql = "SELECT COUNT(s.id) as total_submissions, 
                 AVG((SELECT AVG(rating) FROM survey_responses WHERE submission_id = s.id)) as overall_satisfaction,
                 COUNT(DISTINCT s.office_id) as office_count
                 FROM submissions s JOIN offices o ON s.office_id = o.id $where";
    $stmt = $conn->prepare($statsSql);
    $stmt->execute($params);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    $recentSql = "SELECT s.*, o.name as office_name,
                  (SELECT AVG(rating) FROM survey_responses WHERE submission_id = s.id) as avg_score
                  FROM submissions s JOIN offices o ON s.office_id = o.id $where 
                  ORDER BY s.created_at DESC LIMIT 10";
    $stmt = $conn->prepare($recentSql);
    $stmt->execute($params);
    $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $chartSql = "SELECT DATE_FORMAT(s.created_at, '%b') as month, 
                 AVG((SELECT AVG(rating) FROM survey_responses WHERE submission_id = s.id)) as score
                 FROM submissions s JOIN offices o ON s.office_id = o.id $where
                 GROUP BY month ORDER BY s.created_at ASC";
    $stmt = $conn->prepare($chartSql);
    $stmt->execute($params);
    $chart = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "stats" => $stats, "recent_submissions" => $recent, "chart_data" => $chart]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}