<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Debug mode can be enabled via query parameter or hardcoded
$debugMode = isset($_GET['debug']) && $_GET['debug'] === 'true';
if (!isset($debugMode)) {
    $debugMode = false;
}

// Debug log collection
$debugLog = [];
function add_debug_log($message, $data = []) {
    global $debugLog;
    $debugLog[] = [
        'message' => $message,
        'data' => $data,
        'time' => microtime(true)
    ];
}

function output_debug_log() {
    global $debugLog;
    header('Content-Type: text/plain');
    echo "DEBUG LOG:\n";
    echo "==========\n\n";
    foreach ($debugLog as $entry) {
        echo "TIME: " . date('H:i:s', (int)$entry['time']) . "." . sprintf("%03d", ($entry['time'] - floor($entry['time'])) * 1000) . "\n";
        echo "MESSAGE: {$entry['message']}\n";
        if (!empty($entry['data'])) {
            echo "DATA:\n";
            foreach ($entry['data'] as $key => $value) {
                echo "  $key: " . print_r($value, true) . "\n";
            }
        }
        echo "\n" . str_repeat("-", 50) . "\n\n";
    }
    exit;
}

// Response helper function
function send_response($success, $message, $data = null) {
    global $debugMode;
    if ($debugMode) {
        add_debug_log($message, $data);
        output_debug_log();
    } else {
        header('Content-Type: application/json');
        header('Cache-Control: no-cache, must-revalidate');
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }
}

// Validate request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method: ' . $_SERVER['REQUEST_METHOD']);
}

// Log request details
add_debug_log('Request details', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'post_data' => $_POST
]);

// Required parameters
if (!isset($_POST['type']) || !isset($_POST['id'])) {
    send_response(false, 'Missing required parameters', [
        'received_post' => $_POST
    ]);
}

$type = strtolower($_POST['type']);
$id = (int)$_POST['id'];

// Validate type
if (!in_array($type, ['product', 'inventory'])) {
    send_response(false, 'Invalid type specified: ' . $type);
}

// Get base path - use relative path from api directory
$basePath = dirname(__DIR__);

add_debug_log('Base path configuration', [
    'basePath' => $basePath,
    'script_path' => __FILE__,
    'resolved_path' => realpath($basePath),
    'permissions' => [
        'base_readable' => is_readable($basePath),
        'images_exists' => file_exists("{$basePath}/images"),
        'images_readable' => file_exists("{$basePath}/images") && is_readable("{$basePath}/images")
    ]
]);

// Get file path
$idPadded = str_pad($id, 6, '0', STR_PAD_LEFT);
$folder = substr($idPadded, 0, 3);
$targetFile = "{$basePath}/images/{$type}s/{$folder}/{$id}.webp";

add_debug_log('File details', [
    'type' => $type,
    'id' => $id,
    'folder' => $folder,
    'target_file' => $targetFile,
    'file_exists' => file_exists($targetFile),
    'is_writable' => file_exists($targetFile) && is_writable($targetFile)
]);

// Check if file exists
if (!file_exists($targetFile)) {
    send_response(false, 'Image does not exist', [
        'target_file' => $targetFile
    ]);
}

// Try to delete the file
try {
    if (!unlink($targetFile)) {
        send_response(false, 'Failed to delete image', [
            'target_file' => $targetFile,
            'last_error' => error_get_last()
        ]);
    }

    // Check if folder is empty and delete if it is
    $folderPath = dirname($targetFile);
    if (is_dir($folderPath) && count(glob("$folderPath/*")) === 0) {
        rmdir($folderPath);
    }

    send_response(true, 'Image deleted successfully', [
        'deleted_file' => $targetFile
    ]);

} catch (Exception $e) {
    send_response(false, 'Error deleting image: ' . $e->getMessage(), [
        'trace' => $e->getTraceAsString()
    ]);
} 