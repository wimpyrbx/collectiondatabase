<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('html_errors', 0); // Prevent HTML in error messages

// These won't work via ini_set, they're just for reference
ini_set('upload_max_filesize', '200M');
ini_set('post_max_size', '200M');
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 300);

// Debug mode is always on for now
$debugMode = true;

// Debug log collection
$debugLog = [];
function add_debug_log($message, $data = []) {
    global $debugLog;
    $debugLog[] = [
        'message' => $message,
        'data' => $data,
        'time' => microtime(true),
        'memory' => memory_get_usage(),
        'error' => error_get_last()
    ];
}

// Log ALL request information immediately
add_debug_log('Complete request information', [
    'POST' => $_POST,
    'FILES' => $_FILES,
    'SERVER' => [
        'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'CONTENT_LENGTH' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
        'HTTP_ACCEPT' => $_SERVER['HTTP_ACCEPT'] ?? 'not set',
        'HTTP_CONTENT_TYPE' => $_SERVER['HTTP_CONTENT_TYPE'] ?? 'not set'
    ],
    'PHP Settings' => [
        'file_uploads' => ini_get('file_uploads'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_input_time' => ini_get('max_input_time'),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'max_file_uploads' => ini_get('max_file_uploads')
    ],
    'Raw POST Data Length' => strlen(file_get_contents('php://input'))
]);

function output_debug_log() {
    global $debugLog;
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Debug information',
        'debug_log' => $debugLog
    ], JSON_PRETTY_PRINT);
    exit;
}

// Response helper function
function send_response($success, $message, $data = null) {
    global $debugLog;
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'debug' => [
            'log' => $debugLog,
            'post' => $_POST,
            'files' => $_FILES,
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
            'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set'
        ]
    ], JSON_PRETTY_PRINT);
    exit;
}

// Validate request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_response(false, 'Invalid request method: ' . $_SERVER['REQUEST_METHOD']);
}

// Required parameters
if (empty($_POST['type']) || empty($_POST['id'])) {
    send_response(false, 'Missing required parameters', [
        'received_post' => $_POST,
        'files' => $_FILES,
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'raw_post_size' => strlen(file_get_contents('php://input')),
        'max_post_size' => ini_get('post_max_size'),
        'upload_max_filesize' => ini_get('upload_max_filesize')
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
$folder = substr($id, 0, 3);
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

    // Get original dimensions
    $originalWidth = imagesx($image);
    $originalHeight = imagesy($image);

    // Calculate new dimensions if height exceeds 800px
    $newWidth = $originalWidth;
    $newHeight = $originalHeight;
    if ($originalHeight > 800) {
        $newHeight = 800;
        $newWidth = floor($originalWidth * (800 / $originalHeight));
        
        // Create new resized image
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG images
        if ($imageInfo[2] === IMAGETYPE_PNG) {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
            imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        // Resize the image
        imagecopyresampled(
            $resized,        // destination image
            $image,          // source image
            0, 0,           // destination x, y
            0, 0,           // source x, y
            $newWidth,      // destination width
            $newHeight,     // destination height
            $originalWidth, // source width
            $originalHeight // source height
        );
        
        // Free the original image
        imagedestroy($image);
        $image = $resized;
    }

    // Convert to WebP
    if (function_exists('imagewebp')) {
        // WebP is supported, try to convert
        if (!imagewebp($image, $targetFile, 80)) {
            // If WebP conversion fails, fall back to PNG
            $targetFile = "{$targetDir}/{$id}.png";
            if (!imagepng($image, $targetFile, 9)) {
                send_response(false, 'Failed to convert and save image', [
                    'last_error' => error_get_last(),
                    'target_file' => $targetFile
                ]);
            }
        }
    } else {
        // WebP not supported, use PNG
        $targetFile = "{$targetDir}/{$id}.png";
        if (!imagepng($image, $targetFile, 9)) {
            send_response(false, 'Failed to save image', [
                'last_error' => error_get_last(),
                'target_file' => $targetFile
            ]);
        }
    }

    imagedestroy($image);

    if (!file_exists($targetFile)) {
        send_response(false, 'File was not saved successfully', [
            'target_file' => $targetFile,
            'target_exists' => file_exists($targetFile),
            'target_size' => file_exists($targetFile) ? filesize($targetFile) : 0
        ]);
    }

    // Get the file extension from the actual saved file
    $extension = pathinfo($targetFile, PATHINFO_EXTENSION);
    send_response(true, 'Image uploaded successfully', [
        'path' => "/images/{$type}s/{$folder}/{$id}.{$extension}",
        'size' => filesize($targetFile)
    ]);

} catch (Exception $e) {
    send_response(false, 'Error processing image: ' . $e->getMessage(), [
        'trace' => $e->getTraceAsString()
    ]);
} 