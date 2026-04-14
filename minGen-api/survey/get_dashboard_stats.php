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

$userRole = $_SESSION['role'] ?? null;
$userOfficeId = $_SESSION['office_id'] ?? null;
$userPlant = $_SESSION['plant_name'] ?? '';
$scope = $_GET['scope'] ?? 'local';

$where = " WHERE 1=1 ";
$params = [];

if ($scope === 'local') {
    if ($userRole === 'manager') {
        $where .= " AND LOWER(o.plant_name) = LOWER(?) ";
        $params[] = $userPlant;
    } elseif ($userRole === 'office') {
        $where .= " AND s.office_id = ? ";
        $params[] = $userOfficeId;
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