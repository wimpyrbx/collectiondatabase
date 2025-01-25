<?php
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
$debugMode = false; // Override debug mode

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

// Only set content type header if not checking
if (!isset($_GET['check']) || $_GET['check'] !== 'true') {
    header('Content-Type: image/webp');
    header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
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
    header('Cache-Control: no-cache, must-revalidate'); // Don't cache error images
    
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
if (!in_array($mode, ['products', 'inventory', 'inventory-with-fallback'])) {
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
    return "images/$type/$folder/$id.webp";
}

// Function to serve image or placeholder
function serveImage($path, $placeholder_path, $check = false) {
    if (file_exists($path)) {
        if ($check) {
            http_response_code(200);
            die('Image exists');
        }
        header('Content-Type: image/webp');
        readfile($path);
        exit;
    } else {
        if ($check) {
            http_response_code(404);
            die('Image not found');
        }
        header('Content-Type: image/webp');
        readfile($placeholder_path);
        exit;
    }
}

// Handle different modes
switch ($mode) {
    case 'products':
        $image_path = $base_path . '/' . getImagePath($id, 'products');
        $placeholder_path = $base_path . '/images/placeholder.webp';
        serveImage($image_path, $placeholder_path, $check);
        break;

    case 'inventory':
        $image_path = $base_path . '/' . getImagePath($id, 'inventory');
        $placeholder_path = $base_path . '/images/placeholder.webp';
        serveImage($image_path, $placeholder_path, $check);
        break;

    case 'inventory-with-fallback':
        $product_id = $_GET['product_id'] ?? '';
        if (!is_numeric($product_id)) {
            http_response_code(400);
            die('Invalid product ID');
        }

        $inventory_path = $base_path . '/' . getImagePath($id, 'inventory');
        $product_path = $base_path . '/' . getImagePath($product_id, 'products');
        $placeholder_path = $base_path . '/images/placeholder.webp';

        // Try inventory image first
        if (file_exists($inventory_path)) {
            if ($check) {
                http_response_code(200);
                die('Image exists');
            }
            header('Content-Type: image/webp');
            readfile($inventory_path);
            exit;
        }

        // Try product image next
        if (file_exists($product_path)) {
            if ($check) {
                http_response_code(200);
                die('Image exists');
            }
            header('Content-Type: image/webp');
            readfile($product_path);
            exit;
        }

        // Fall back to placeholder
        if ($check) {
            http_response_code(204); // No Content
            exit;
        }
        header('Content-Type: image/webp');
        readfile($placeholder_path);
        break;
}

// If we get here, no image was found
// Don't send 404 since we'll serve a placeholder or error image
if ($debugMode) {
    add_debug_log("No requested image found, checking placeholder", [
        'Placeholder Path' => $placeholderPath,
        'Placeholder Exists' => file_exists($placeholderPath)
    ]);
}

// Return placeholder if available
$placeholderPath = "{$base_path}/images/placeholder.webp";
if (file_exists($placeholderPath)) {
    if ($debugMode) {
        add_debug_log("Using placeholder image");
        output_debug_log();
    }
    readfile($placeholderPath);
} else {
    if ($debugMode) {
        add_debug_log("No placeholder found, returning error image");
        output_debug_log();
    }
    return_error_image();
} 