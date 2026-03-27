<?php

ob_clean();
// 1. ADD THESE CORS HEADERS AT THE VERY TOP (Crucial!)
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 2. Handle the 'Preflight' request from the browser
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';
header("Content-Type: application/json");

try {
    // 1. Fetch the main submission data
    $sql = "SELECT 
                s.*, 
                o.name as office_name, 
                o.plant_name,
                asvc.service_name,
                (SELECT AVG(rating) FROM survey_responses WHERE submission_id = s.id AND question_code LIKE 'SQD%') as avg_rating
            FROM submissions s
            JOIN offices o ON s.office_id = o.id
            JOIN arta_services asvc ON s.service_id = asvc.id
            ORDER BY s.created_at DESC";
            
    $stmt = $conn->query($sql);
    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. For each submission, fetch its specific ratings (CC1, SQD0, etc.)
    foreach ($submissions as &$s) {
        $subId = $s['id'];
        $ratingSql = "SELECT question_code, rating FROM survey_responses WHERE submission_id = ?";
        $ratingStmt = $conn->prepare($ratingSql);
        $ratingStmt->execute([$subId]);
        $ratings = $ratingStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. PIVOT: Convert rows into object properties
        // This turns a row like {question_code: 'CC1', rating: 1} into $s['CC1'] = 1
        foreach ($ratings as $r) {
            $key = $r['question_code']; 
            $s[$key] = $r['rating'];
            
            // Optional: Support both 'CC1' and 'cc1_val' for your JS logic
            $s[strtolower($key) . '_val'] = $r['rating'];
        }
    }

    echo json_encode(["status" => "success", "data" => $submissions]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}