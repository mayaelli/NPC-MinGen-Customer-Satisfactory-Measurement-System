<?php
session_start();
require_once '../config/db.php';

// 2. HEADERS
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the JSON data from React
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data provided"]);
    exit;
}

try {
    // Start Transaction
    $conn->beginTransaction();

    // 1. Insert into 'submissions' table
    $stmt1 = $conn->prepare("INSERT INTO submissions (
        office_id, service_id, full_name, designation, client_type, 
        sex, age, region, email, phone, suggestions, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt1->execute([
        $data['office_id'],
        $data['service_id'],
        $data['full_name'],
        $data['designation'] ?? null,
        $data['client_type'],
        $data['sex'],
        $data['age'],
        $data['region'] ?? null,
        $data['email'] ?? null,
        $data['phone'] ?? null,
        $data['suggestions'] ?? null,
        $data['signature'] // This is the Base64 string from React
    ]);

    // Get the ID of the submission we just created
    $submission_id = $conn->lastInsertId();

    // 2. Insert into 'survey_responses' table
    // $data['ratings'] is an object like { "CC1": 1, "SQD0": 5, ... }
    if (isset($data['ratings']) && is_array($data['ratings'])) {
        $stmt2 = $conn->prepare("INSERT INTO survey_responses (submission_id, question_code, rating) VALUES (?, ?, ?)");
        
        foreach ($data['ratings'] as $question_code => $rating) {
            $stmt2->execute([
                $submission_id,
                $question_code,
                $rating
            ]);
        }
    }

    // If everything is fine, commit the changes
    $conn->commit();

    echo json_encode([
        "status" => "success", 
        "message" => "Survey submitted successfully",
        "submission_id" => $submission_id
    ]);

} catch (Exception $e) {
    // If anything goes wrong, undo everything
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    
    echo json_encode([
        "status" => "error", 
        "message" => "Database error: " . $e->getMessage()
    ]);
}