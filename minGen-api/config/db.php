<?php
/**
 * DATABASE CONNECTION & CORS CONFIGURATION
 * Project: NAPOCOR MinGen CSM
 */

// Database Credentials
$host = "localhost";
$db_name = "mingen_csm"; // The name of the database you manually created
$username = "root";      // Default XAMPP username
$password = "";          // Default XAMPP password (empty)

try {
    // 4. Create the Connection using PDO (more secure than mysqli)
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    
    // Set error mode to Exception so we can catch database errors
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Set default fetch mode to Associative Array
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

} catch(PDOException $exception) {
    // If connection fails, return a JSON error so React knows what happened
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database Connection Failed: " . $exception->getMessage()
    ]);
    exit();
}


/**
 * SYSTEM UTILITY: Activity Logger
 * Records administrative actions into the activity_logs table.
 */
function logAction($conn, $user_id, $action_type, $target_table, $details) {
    if (!$user_id) return; // Don't log if no user session is active

    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $stmt = $conn->prepare("INSERT INTO activity_logs (user_id, action_type, target_table, action_details, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $action_type, $target_table, $details, $ip]);
    } catch (Exception $e) {
        // Fail silently in production, or check error_log for debugging
        error_log("Activity Log Error: " . $e->getMessage());
    }
}

?>