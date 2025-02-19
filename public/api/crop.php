<?php
// Start output buffering immediately
ob_start();

// Strict error handling
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, $errno, 0, $errfile, $errline);
});

try {
    // Disable error output to page but keep error logging
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('html_errors', 0);

    // Set headers
    header("Access-Control-Allow-Origin: http://localhost:5173");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Accept");
    header('Content-Type: application/json');

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

    // Response helper function with enhanced error capture
    function send_response($success, $message, $data = null) {
        global $debugLog;
        
        // Get the current output buffer contents
        $output = '';
        while (ob_get_level()) {
            $output .= ob_get_clean();
        }
        
        // Start a new buffer for our JSON response
        ob_start();
        
        // Prepare response data with detailed error information
        $response = [
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'debug' => [
                'log' => $debugLog,
                'output_buffer' => $output,
                'post_data' => file_get_contents('php://input'),
                'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
                'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
                'php_settings' => [
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'gd_info' => function_exists('gd_info') ? gd_info() : 'GD not available'
                ],
                'last_error' => error_get_last(),
                'headers_sent' => headers_sent(),
                'output_level' => ob_get_level()
            ]
        ];
        
        // Ensure headers are set if not already sent
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        
        // Output JSON
        echo json_encode($response, JSON_PRETTY_PRINT);
        ob_end_flush();
        exit;
    }

    // Log initial request information
    add_debug_log('Initial request information', [
        'method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
        'headers' => getallheaders()
    ]);

    // Handle preflight request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        ob_clean();
        exit(0);
    }

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(false, 'Method not allowed');
    }

    // Get JSON body
    $json = file_get_contents('php://input');
    if (!$json) {
        send_response(false, 'No data received');
    }

    $data = json_decode($json, true);
    if (!$data) {
        send_response(false, 'Invalid JSON data: ' . json_last_error_msg(), [
            'raw_input' => $json,
            'json_error' => json_last_error(),
            'json_error_msg' => json_last_error_msg()
        ]);
    }

    add_debug_log('Received data', $data);

    // Validate required parameters
    if (!isset($data['type']) || !isset($data['id']) || !isset($data['crop'])) {
        send_response(false, 'Missing required parameters', [
            'received_data' => $data
        ]);
    }

    $type = strtolower($data['type']);
    $id = (int)$data['id'];
    $crop = $data['crop'];

    // Validate type
    if (!in_array($type, ['product', 'inventory'])) {
        send_response(false, 'Invalid type specified: ' . $type);
    }

    // Validate crop data
    if (!isset($crop['x']) || !isset($crop['y']) || !isset($crop['width']) || !isset($crop['height'])) {
        send_response(false, 'Invalid crop parameters', [
            'received_crop' => $crop
        ]);
    }

    // Get base path and construct file paths
    $basePath = dirname(__DIR__);
    $folder = substr($id, 0, 3);
    $imagePath = "{$basePath}/images/{$type}s/{$folder}/{$id}";

    // Find the actual image file (webp or png)
    $sourceFile = null;
    if (file_exists($imagePath . '.webp')) {
        $sourceFile = $imagePath . '.webp';
    } elseif (file_exists($imagePath . '.png')) {
        $sourceFile = $imagePath . '.png';
    }

    if (!$sourceFile) {
        send_response(false, 'Image not found', [
            'searched_paths' => [
                $imagePath . '.webp',
                $imagePath . '.png'
            ]
        ]);
    }

    // Add detailed file checks
    add_debug_log('File checks', [
        'sourceFile' => $sourceFile,
        'file_exists' => file_exists($sourceFile),
        'is_readable' => is_readable($sourceFile),
        'file_size' => file_exists($sourceFile) ? filesize($sourceFile) : 'N/A',
        'file_type' => file_exists($sourceFile) ? mime_content_type($sourceFile) : 'N/A'
    ]);

    if (!file_exists($sourceFile)) {
        send_response(false, 'Image file does not exist', [
            'sourceFile' => $sourceFile
        ]);
    }

    if (!is_readable($sourceFile)) {
        send_response(false, 'Image file is not readable', [
            'sourceFile' => $sourceFile,
            'permissions' => substr(sprintf('%o', fileperms($sourceFile)), -4)
        ]);
    }

    try {
        // Load the source image
        $imageInfo = getimagesize($sourceFile);
        if ($imageInfo === false) {
            throw new Exception('Invalid image file');
        }

        add_debug_log('Image info', [
            'width' => $imageInfo[0],
            'height' => $imageInfo[1],
            'type' => $imageInfo[2],
            'mime' => $imageInfo['mime']
        ]);

        // Create image resource based on file type
        switch ($imageInfo[2]) {
            case IMAGETYPE_JPEG:
                $sourceImage = imagecreatefromjpeg($sourceFile);
                break;
            case IMAGETYPE_PNG:
                $sourceImage = imagecreatefrompng($sourceFile);
                break;
            case IMAGETYPE_GIF:
                $sourceImage = imagecreatefromgif($sourceFile);
                break;
            case IMAGETYPE_WEBP:
                $sourceImage = imagecreatefromwebp($sourceFile);
                break;
            default:
                throw new Exception('Unsupported image format');
        }

        if ($sourceImage === false) {
            throw new Exception('Failed to create image resource');
        }

        // Convert percentage-based crop to pixels
        $cropX = ($crop['x'] / 100) * $imageInfo[0];
        $cropY = ($crop['y'] / 100) * $imageInfo[1];
        $cropWidth = ($crop['width'] / 100) * $imageInfo[0];
        $cropHeight = ($crop['height'] / 100) * $imageInfo[1];

        add_debug_log('Crop calculations', [
            'original' => [
                'width' => $imageInfo[0],
                'height' => $imageInfo[1]
            ],
            'crop_percent' => $crop,
            'crop_pixels' => [
                'x' => $cropX,
                'y' => $cropY,
                'width' => $cropWidth,
                'height' => $cropHeight
            ]
        ]);

        // Round the crop coordinates and dimensions to the nearest integer
        $cropX = round($cropX);
        $cropY = round($cropY);
        $cropWidth = round($cropWidth);
        $cropHeight = round($cropHeight);

        // Create cropped image
        $croppedImage = imagecreatetruecolor($cropWidth, $cropHeight);

        // Preserve transparency for PNG images
        if ($imageInfo[2] === IMAGETYPE_PNG) {
            imagealphablending($croppedImage, false);
            imagesavealpha($croppedImage, true);
            $transparent = imagecolorallocatealpha($croppedImage, 255, 255, 255, 127);
            imagefilledrectangle($croppedImage, 0, 0, $cropWidth, $cropHeight, $transparent);
        }

        // Perform the crop
        if (!imagecopyresampled(
            $croppedImage,
            $sourceImage,
            0, 0,
            $cropX, $cropY,
            $cropWidth, $cropHeight,
            $cropWidth, $cropHeight
        )) {
            throw new Exception('Failed to crop image');
        }

        // Clean up source image
        imagedestroy($sourceImage);

        // Determine output format and save
        $extension = pathinfo($sourceFile, PATHINFO_EXTENSION);
        $targetFile = $imagePath . '.' . $extension;

        $success = false;
        switch ($extension) {
            case 'webp':
                $success = imagewebp($croppedImage, $targetFile, 80);
                break;
            case 'png':
                $success = imagepng($croppedImage, $targetFile, 9);
                break;
            case 'jpg':
            case 'jpeg':
                $success = imagejpeg($croppedImage, $targetFile, 90);
                break;
            case 'gif':
                $success = imagegif($croppedImage, $targetFile);
                break;
        }

        // Clean up cropped image
        imagedestroy($croppedImage);

        if (!$success) {
            throw new Exception('Failed to save cropped image');
        }

        send_response(true, 'Image cropped successfully', [
            'path' => "/images/{$type}s/{$folder}/{$id}.{$extension}",
            'dimensions' => [
                'width' => $cropWidth,
                'height' => $cropHeight
            ]
        ]);

    } catch (Exception $e) {
        send_response(false, 'Failed to crop image: ' . $e->getMessage(), [
            'error' => [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]
        ]);
    }

} catch (Throwable $e) {
    // Get any buffered output
    $output = '';
    while (ob_get_level()) {
        $output .= ob_get_clean();
    }
    
    // Start a new buffer for our error response
    ob_start();
    
    // Ensure we're sending JSON header if possible
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    
    // Send detailed error response
    echo json_encode([
        'success' => false,
        'message' => 'Fatal error occurred',
        'error' => [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'previous_output' => $output
        ]
    ]);
    
    ob_end_flush();
    exit;
} 