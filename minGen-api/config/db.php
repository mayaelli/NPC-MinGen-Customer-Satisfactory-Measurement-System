<?php
/**
 * DATABASE CONNECTION & CORS CONFIGURATION
 * Project: NAPOCOR MinGen CSM
 */

// 1. CORS Headers: Allows your React app (Vite) to talk to this PHP backend
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// 2. Handle "Pre-flight" requests (Browsers send an OPTIONS request before the actual POST)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Database Credentials
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
?>