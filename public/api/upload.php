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
    'post_data' => $_POST,
    'files' => isset($_FILES) ? array_keys($_FILES) : 'No files'
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

// Validate file upload
if (!isset($_FILES['image'])) {
    send_response(false, 'No file uploaded', [
        'files' => $_FILES
    ]);
}

if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload'
    ];
    
    $errorCode = $_FILES['image']['error'];
    $errorMessage = isset($errorMessages[$errorCode]) 
        ? $errorMessages[$errorCode] 
        : 'Unknown upload error';
    
    send_response(false, $errorMessage, [
        'error_code' => $errorCode,
        'file_info' => $_FILES['image']
    ]);
}

// Get base path - use relative path from api directory
$basePath = dirname(__DIR__);

add_debug_log('Base path configuration', [
    'basePath' => $basePath,
    'script_path' => __FILE__,
    'resolved_path' => realpath($basePath),
    'permissions' => [
        'base_writable' => is_writable($basePath),
        'images_exists' => file_exists("{$basePath}/images"),
        'images_writable' => file_exists("{$basePath}/images") && is_writable("{$basePath}/images")
    ]
]);

// Create folder structure
$idPadded = str_pad($id, 6, '0', STR_PAD_LEFT);
$folder = substr($idPadded, 0, 3);
$targetDir = "{$basePath}/images/{$type}s/{$folder}";

// Ensure target directory exists
if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        send_response(false, 'Failed to create target directory', [
            'target_dir' => $targetDir,
            'parent_writable' => is_writable(dirname($targetDir))
        ]);
    }
}

// Process uploaded file
$uploadedFile = $_FILES['image'];
$sourceFile = $uploadedFile['tmp_name'];
$targetFile = "{$targetDir}/{$id}.webp";

add_debug_log('Processing upload', [
    'type' => $type,
    'id' => $id,
    'folder' => $folder,
    'targetDir' => $targetDir,
    'targetFile' => $targetFile,
    'source_exists' => file_exists($sourceFile),
    'target_dir_writable' => is_writable($targetDir)
]);

// Convert to WebP and save
try {
    // Create image resource based on uploaded file type
    $imageInfo = getimagesize($sourceFile);
    if ($imageInfo === false) {
        send_response(false, 'Invalid image file', [
            'uploaded_file' => $uploadedFile
        ]);
    }

    add_debug_log('Image info', [
        'width' => $imageInfo[0],
        'height' => $imageInfo[1],
        'type' => $imageInfo[2],
        'mime' => $imageInfo['mime']
    ]);

    switch ($imageInfo[2]) {
        case IMAGETYPE_JPEG:
            $image = imagecreatefromjpeg($sourceFile);
            break;
        case IMAGETYPE_PNG:
            $image = imagecreatefrompng($sourceFile);
            break;
        case IMAGETYPE_GIF:
            $image = imagecreatefromgif($sourceFile);
            break;
        case IMAGETYPE_WEBP:
            $image = imagecreatefromwebp($sourceFile);
            break;
        default:
            send_response(false, 'Unsupported image format', [
                'type' => $imageInfo[2],
                'mime' => $imageInfo['mime']
            ]);
    }

    if ($image === false) {
        send_response(false, 'Failed to create image resource', [
            'last_error' => error_get_last()
        ]);
    }

    // Convert to WebP
    if (!imagewebp($image, $targetFile, 80)) {
        send_response(false, 'Failed to convert and save image', [
            'last_error' => error_get_last(),
            'target_file' => $targetFile
        ]);
    }

    imagedestroy($image);

    if (!file_exists($targetFile)) {
        send_response(false, 'File was not saved successfully', [
            'target_file' => $targetFile,
            'target_exists' => file_exists($targetFile),
            'target_size' => file_exists($targetFile) ? filesize($targetFile) : 0
        ]);
    }

    send_response(true, 'Image uploaded successfully', [
        'path' => "/images/{$type}s/{$folder}/{$id}.webp",
        'size' => filesize($targetFile)
    ]);

} catch (Exception $e) {
    send_response(false, 'Error processing image: ' . $e->getMessage(), [
        'trace' => $e->getTraceAsString()
    ]);
} 