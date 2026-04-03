<?php
session_start();
require_once '../config/db.php';

// 2. HEADERS
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

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