<?php
/**
 * Image API Endpoint
 * 
 * Handles dynamic image serving with multiple fallback strategies. Supports three operation modes
 * with caching headers and development features.
 *
 * Modes:
 * 1. product
 *    - Fetches product-specific image
 *    - Parameters: id=[numeric product ID]
 *    - Path: /images/product/xxx/[id].webp
 * 
 * 2. inventory
 *    - Fetcks inventory-specific image
 *    - Parameters: id=[numeric inventory ID]
 *    - Path: /images/inventory/xxx/[id].webp
 * 
 * 3. inventory-with-fallback
 *    - Attempts inventory image first, falls back to product image
 *    - Parameters:
 *      - id=[numeric inventory ID]
 *      - product_id=[numeric product ID]
 *    - Failure cascade:
 *      1. Inventory image
 *      2. Product image
 *      3. Placeholder.webp
 *      4. Hardcoded SVG error image
 *
 * Status Codes:
 * - 200 OK: Successful image response (actual image or error SVG)
 * - 204 No Content: Check request (check=true) and image not found
 * - 400 Bad Request: Invalid parameters or missing required values
 *
 * Query Parameters:
 * - mode: Operation mode (required)
 * - id: Item ID (required)
 * - check: Set to 'true' for existence check (returns 200/204 only)
 * - debug: Set to 'true' for debug output (disables image output)
 * - devmode: Set to 'true' for CORS headers and development access
 *
 * Examples:
 * - Production image: ?mode=product&id=12345
 * - Inventory check: ?mode=inventory&id=67890&check=true
 * - Fallback flow: ?mode=inventory-with-fallback&id=67890&product_id=12345
 *
 * Error Handling:
 * - All errors return 200 status with SVG error image to prevent broken image icons
 * - Actual error details available through debug mode
 */

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

// Set debug mode - can be overridden here
$debugMode = true; // Override debug mode

// Or check URL parameter if not overridden
if (!isset($debugMode)) {
    $debugMode = isset($_GET['debug']) && $_GET['debug'] === 'true';
}

// Initial debug info
if ($debugMode) {
    add_debug_log("Starting image request", [
        'GET Params' => $_GET,
        'Server Path' => __DIR__,
        'Request Method' => $_SERVER['REQUEST_METHOD']
    ]);
}

// CORS headers for dev mode
if (isset($_GET['devmode']) && $_GET['devmode'] === 'true') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if ($debugMode) {
            add_debug_log("Handling OPTIONS request");
            output_debug_log();
        }
        exit;
    }
}

// Disable caching headers at the top
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Only set content type header if not checking
if (!isset($_GET['check']) || $_GET['check'] !== 'true') {
    header('Content-Type: image/webp');
    // Enable caching for actual images
    header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
    header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');
}

// Helper function to return error image
function return_error_image() {
    global $debugMode;
    if ($debugMode) {
        add_debug_log("Returning error image");
        output_debug_log();
    }
    
    // Ensure we send 200 status since we're successfully serving a fallback image
    http_response_code(200);
    header('Content-Type: image/svg+xml');
    // Don't cache error/placeholder images
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    // Using game cover proportions (170x240 - standard game case size)
    echo '<svg xmlns="http://www.w3.org/2000/svg" width="170" height="240" viewBox="0 0 170 240">'
       . '<rect width="170" height="240" fill="#1F2937"/>'
       . '<path d="M150 20H20c-1.1 0-2 .9-2 2v196c0 1.1.9 2 2 2h130c1.1 0 2-.9 2-2V22c0-1.1-.9-2-2-2zm-1 197H21c-.55 0-1-.45-1-1V23c0-.55.45-1 1-1h128c.55 0 1 .45 1 1v193c0 .55-.45 1-1 1z" fill="#4B5563"/>'
       . '<circle cx="120" cy="45" r="10" fill="#4B5563"/>'
       . '<path d="M45 160h80L105 110 85 135 65 110z" fill="#4B5563"/>'
       . '</svg>';
    exit;
}

// Get parameters
$mode = $_GET['mode'] ?? '';
$id = $_GET['id'] ?? '';
$check = isset($_GET['check']) && $_GET['check'] === 'true';
$devmode = isset($_GET['devmode']) && $_GET['devmode'] === 'true';

// Validate mode
if (!in_array($mode, ['product', 'inventory', 'inventory-with-fallback'])) {
    http_response_code(400);
    die('Invalid mode');
}

// Validate ID
if (!is_numeric($id)) {
    http_response_code(400);
    die('Invalid ID');
}

// Get the base path for images
$base_path = $devmode ? '/home/ltg/collectiondatabase/public' : $_SERVER['DOCUMENT_ROOT'];

// Function to get image path
function getImagePath($id, $type) {
    $folder = substr($id, 0, 3);
    $path = "images/{$type}/{$folder}/{$id}.webp";
    if ($GLOBALS['debugMode']) {
        add_debug_log("Generated image path", [
            'id' => $id,
            'type' => $type,
            'folder' => $folder,
            'path' => $path,
            'absolute_path' => $GLOBALS['base_path'] . '/' . $path,
            'exists' => file_exists($GLOBALS['base_path'] . '/' . $path),
            'directory_exists' => is_dir(dirname($GLOBALS['base_path'] . '/' . $path))
        ]);
    }
    return $path;
}

// Centralized header configuration
function set_image_headers($cache = false) {
    header('Content-Type: image/webp');
    if ($cache) {
        header('Cache-Control: public, max-age=31536000');
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');
    } else {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }
}

// Unified image serving logic
function serve_file($path, $check) {
    global $debugMode;
    
    if ($check) {
        http_response_code(file_exists($path) ? 200 : 204);
        exit;
    }
    
    if (file_exists($path)) {
        set_image_headers(true);
        readfile($path);
        exit;
    }
    return false;
}

// Consolidated validation
function validate_request($mode, $id) {
    if (!in_array($mode, ['product', 'inventory', 'inventory-with-fallback'])) {
        http_response_code(400);
        die('Invalid mode');
    }
    
    if (!is_numeric($id)) {
        http_response_code(400);
        die('Invalid ID');
    }
}

// Simplified fallback handling
function handle_fallback($paths, $check) {
    global $debugMode, $base_path;
    
    foreach ($paths as $path) {
        if (serve_file($path, $check)) return;
    }
    
    $placeholder = "{$base_path}/images/placeholder.webp";
    if (serve_file($placeholder, $check)) return;
    
    return_error_image();
}

if ($debugMode) {
    add_debug_log("Base path and environment info", [
        'base_path' => $base_path,
        'document_root' => $_SERVER['DOCUMENT_ROOT'],
        'script_filename' => $_SERVER['SCRIPT_FILENAME'],
        'current_dir' => __DIR__,
        'devmode' => $devmode,
        'base_path_exists' => file_exists($base_path),
        'base_path_is_dir' => is_dir($base_path),
        'base_path_permissions' => file_exists($base_path) ? substr(sprintf('%o', fileperms($base_path)), -4) : 'N/A',
        'images_dir_exists' => is_dir($base_path . '/images'),
        'images_dir_contents' => is_dir($base_path . '/images') ? scandir($base_path . '/images') : 'directory not found'
    ]);
}

// Simplified mode handling
switch ($mode) {
    case 'product':
        handle_fallback([$base_path . '/' . getImagePath($id, 'product')], $check);
        break;

    case 'inventory':
        handle_fallback([$base_path . '/' . getImagePath($id, 'inventory')], $check);
        break;

    case 'inventory-with-fallback':
        $product_id = $_GET['product_id'] ?? '';
        if (!is_numeric($product_id)) {
            http_response_code(400);
            die('Invalid product ID');
        }
        
        handle_fallback([
            $base_path . '/' . getImagePath($id, 'inventory'),
            $base_path . '/' . getImagePath($product_id, 'product')
        ], $check);
        break;
}

// Final fallback
handle_fallback(["{$base_path}/images/placeholder.webp"], $check); 