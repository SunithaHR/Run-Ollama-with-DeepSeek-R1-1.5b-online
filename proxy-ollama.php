<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, POST, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

$input = file_get_contents("php://input");  // Read the raw POST data

// Decode JSON to associative array
$data = json_decode($input, true);

// Debugging: Log what is being received
error_log("Received data: " . print_r($data, true));

// Check if the message is correctly structured
if (isset($data['message']) && is_array($data['message']) && !empty($data['message'])) {
    // Extract the content from the first message
    $user_message = $data['message'][0]['content'];
    
    // Debugging: Check if the message is properly extracted
    error_log("Extracted message: " . $user_message);

    // Prepare data for the Ollama API
    $api_data = array(
        "model" => "deepseek-r1:1.5b",
        "streaming" => false,  // Disable streaming for simplicity
        "options" => array(
            "temperature" => 0.1,
            "repeat_penalty" => 1.2,
            "numa" => true
        ),
        "messages" => $user_message  // Send as string to Ollama API
    );

    // Convert to JSON format
    $json_data = json_encode($api_data);

    // Ollama API URL
    $url = "http://127.0.0.1:11434/api/chat";  // Adjust IP if needed

    // Initialize cURL session
    $ch = curl_init($url);

    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));

    // Execute the request
    $response = curl_exec($ch);

    // Error handling
    if (curl_errno($ch)) {
        echo 'cURL Error: ' . curl_error($ch);
    } else {
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($http_code === 400) {
            echo "Ollama API returned HTTP code 400. Response: " . $response;
        } elseif ($http_code !== 200) {
            echo "Ollama API returned HTTP code: " . $http_code;
        } else {
            echo $response;  // Send the API response back to frontend
        }
    }

    // Close cURL session
    curl_close($ch);

} else {
    // Error message if message is not correctly received
    echo "No valid message received from frontend.";
}
?>
