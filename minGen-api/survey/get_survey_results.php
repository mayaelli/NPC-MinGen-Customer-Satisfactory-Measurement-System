<?php
session_start();
require_once '../config/db.php';

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. RESOLVE USER IDENTITY
// Primary: PHP session (set by login.php)
// Fallback: user_id query param — look up role/office from DB
$userRole     = $_SESSION['role']      ?? null;
$userOfficeId = $_SESSION['office_id'] ?? null;
$userPlant    = $_SESSION['plant_name'] ?? '';

if (!$userRole && isset($_GET['user_id'])) {
    $uid = intval($_GET['user_id']);
    $uStmt = $conn->prepare("SELECT u.role, u.office_id, o.plant_name 
                              FROM users u 
                              LEFT JOIN offices o ON u.office_id = o.id 
                              WHERE u.id = ? AND u.is_active = 1 LIMIT 1");
    $uStmt->execute([$uid]);
    $uRow = $uStmt->fetch();
    if ($uRow) {
        $userRole     = $uRow['role'];
        $userOfficeId = $uRow['office_id'];
        $userPlant    = $uRow['plant_name'] ?? '';
    }
}

// Guard: reject if still no role resolved
if (!$userRole) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "No active session. Please log in."]);
    exit;
}

try {
    // 2. CHECK AUDITOR STATUS (The "Toggle" Logic)
    $isAuditor = false;
    if ($userRole === 'office') {
        $auditCheck = $conn->prepare("SELECT is_auditor_enabled FROM offices WHERE id = ?");
        $auditCheck->execute([$userOfficeId]);
        $officeRow = $auditCheck->fetch();
        $isAuditor = ($officeRow && $officeRow['is_auditor_enabled'] == 1);
    }

    // 3. BASE SQL (Changed to LEFT JOIN for safety)
    $sql = "SELECT 
            s.*, 
            o.name as office_name, 
            o.plant_name,
            asvc.service_name,
            asvc.service_type,
            (SELECT AVG(rating) 
             FROM survey_responses 
             WHERE submission_id = s.id 
             AND question_code LIKE 'SQD%') as avg_rating
        FROM submissions s
        JOIN offices o ON s.office_id = o.id
        LEFT JOIN arta_services asvc ON s.service_id = asvc.id";

    $whereClauses = [];
    $params = [];

    // --- 4. THE NEW RBAC LOGIC ---
    if ($userRole === 'super_admin' || $userRole === 'admin' || $isAuditor) {
        // "God Mode" / Auditor - No filters, sees everything.
    } 
    elseif ($userRole === 'manager') {
        // PLANT LEVEL: Managers see all offices within their specific Plant.
        if (!empty($userPlant)) {
            $whereClauses[] = "LOWER(o.plant_name) = LOWER(?)";
            $params[] = trim($userPlant);
        } else {
            // Safety: If plant_name is missing from session, return nothing.
            echo json_encode(["status" => "success", "data" => [], "message" => "No plant assigned to manager."]);
            exit;
        }
    } 
    elseif ($userRole === 'office') {
        // UNIT LEVEL: Offices only see their own submissions.
        if (!empty($userOfficeId)) {
            $whereClauses[] = "s.office_id = ?";
            $params[] = $userOfficeId;
        } else {
            // Safety: If office_id is missing from session, return nothing.
            echo json_encode(["status" => "success", "data" => [], "message" => "No office ID found in session."]);
            exit;
        }
    } 
    else {
        // Unauthorized or Guest access.
        echo json_encode(["status" => "error", "message" => "Unauthorized Access"]);
        exit;
    }

    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }

    $sql .= " ORDER BY s.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. FETCH RATINGS (Pivot Logic)
    foreach ($submissions as &$s) {
        $ratingSql = "SELECT question_code, rating FROM survey_responses WHERE submission_id = ?";
        $ratingStmt = $conn->prepare($ratingSql);
        $ratingStmt->execute([$s['id']]);
        $ratings = $ratingStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ratings as $r) {
            $key = $r['question_code']; 
            $s[$key] = $r['rating'];
            $s[strtolower($key) . '_val'] = $r['rating'];
        }
    }

    echo json_encode(["status" => "success", "data" => $submissions]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}