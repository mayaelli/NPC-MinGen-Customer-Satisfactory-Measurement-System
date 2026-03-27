<?php
require_once '../config/db.php';

$data = json_decode(file_get_contents("php://input"));

if ($data) {
    try {
        $conn->beginTransaction();

        // 1. Process Signature (Base64 to Image File)
        $sig_base64 = $data->signature; 
        $sig_base64 = str_replace('data:image/png;base64,', '', $sig_base64);
        $sig_image = base64_decode($sig_base64);
        $file_name = 'sig_' . uniqid() . '.png';
        file_put_contents('../uploads/signatures/' . $file_name, $sig_image);

        // 2. Insert Submission
        $stmt = $conn->prepare("INSERT INTO submissions (full_name, office_id, service_id, signature_path, sex, age) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$data->full_name, $data->office_id, $data->service_id, $file_name, $data->sex, $data->age]);
        $submission_id = $conn->lastInsertId();

        // 3. Insert Ratings (Responses)
        $resp_stmt = $conn->prepare("INSERT INTO responses (submission_id, question_key, score) VALUES (?, ?, ?)");
        foreach ($data->ratings as $key => $score) {
            $resp_stmt->execute([$submission_id, $key, $score]);
        }

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Survey submitted!"]);
    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}