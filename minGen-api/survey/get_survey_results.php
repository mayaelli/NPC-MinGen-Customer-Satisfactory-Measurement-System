<?php
session_start();
ob_clean();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';
header("Content-Type: application/json");

// Roles: super_admin = "God Mode" | auditor = "Global View" | manager = Plant-level | office = Unit-level
$userRole   = $_SESSION['role']      ?? 'office';
$userOffice = $_SESSION['office_id'] ?? null;
$userPlant  = $_SESSION['plant_name'] ?? '';

try {
    // 1. BASE SQL
    $sql = "SELECT 
                s.*, 
                o.name as office_name, 
                o.plant_name,
                asvc.service_name
            FROM submissions s
            JOIN offices o ON s.office_id = o.id
            JOIN arta_services asvc ON s.service_id = asvc.id";

    $whereClauses = [];
    $params = [];

    // --- 2. RBAC FILTERING LOGIC ---
    if ($userRole === 'super_admin') {
        // "God Mode" — full access to all data, no filters
    }
    elseif ($userRole === 'auditor') {
        // "Global View" — read-only, sees all data across all plants
    }
    elseif ($userRole === 'manager') {
        // Plant-level — filtered to their plant only
        $whereClauses[] = "o.plant_name = ?";
        $params[] = $userPlant;
    }
    elseif ($userRole === 'office') {
        // Unit-level — filtered to their specific office only
        $whereClauses[] = "s.office_id = ?";
        $params[] = $userOffice;
    }

    // Append filters if they exist
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(" AND ", $whereClauses);
    }

    $sql .= " ORDER BY s.created_at DESC";

    // Prepare and execute the main query
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. FETCH RATINGS (Keep your existing pivot logic)
    foreach ($submissions as &$s) {
        $subId = $s['id'];
        $ratingSql = "SELECT question_code, rating FROM survey_responses WHERE submission_id = ?";
        $ratingStmt = $conn->prepare($ratingSql);
        $ratingStmt->execute([$subId]);
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