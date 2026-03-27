// C:/xampp/htdocs/MinGen CSM/mingen-api/survey/get_dashboard_stats.php
<?php
require_once '../config/db.php';

try {
    // 1. Basic Stats
    $total = $conn->query("SELECT COUNT(*) FROM submissions")->fetchColumn();
    $avg = $conn->query("SELECT AVG(score) FROM responses")->fetchColumn();
    $offices = $conn->query("SELECT COUNT(*) FROM offices")->fetchColumn();

    // 2. Recent Submissions with Joins
    $recent_query = "SELECT s.*, o.name as office_name, asrv.service_name, 
                    (SELECT AVG(score) FROM responses WHERE submission_id = s.id) as avg_score
                    FROM submissions s
                    JOIN offices o ON s.office_id = o.id
                    JOIN arta_services asrv ON s.service_id = asrv.id
                    ORDER BY s.created_at DESC LIMIT 10";
    
    $recent = $conn->query($recent_query)->fetchAll();

    echo json_encode([
        "status" => "success",
        "stats" => [
            "total_submissions" => (int)$total,
            "overall_satisfaction" => round($avg, 1),
            "office_count" => (int)$offices
        ],
        "recent_submissions" => $recent
    ]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}