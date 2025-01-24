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

header('Content-Type: image/webp');
header('Cache-Control: public, max-age=31536000'); // Cache for 1 year

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

// Validate required parameters
if (!isset($_GET['mode']) || !isset($_GET['id'])) {
    http_response_code(400);
    if ($debugMode) {
        add_debug_log("Missing required parameters", [
            'Required' => ['mode', 'id'],
            'Received' => $_GET
        ]);
        output_debug_log();
    }
    return_error_image();
}

// CORS headers for dev mode
if (isset($_GET['devmode']) && $_GET['devmode'] === 'true') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Base paths configuration
$devMode = isset($_GET['devmode']) && $_GET['devmode'] === 'true';
$basePath = $devMode ? '/home/ltg/collectiondatabase/public' : '..';

if ($debugMode) {
    add_debug_log("Base configuration", [
        'Dev Mode' => $devMode,
        'Base Path' => $basePath
    ]);
}

// Get and validate parameters
$mode = $_GET['mode'];
$id = intval($_GET['id']);
$product_id = intval($_GET['product_id'] ?? 0);

if (!$id || !in_array($mode, ['products', 'inventory', 'inventory-with-fallback'])) {
    http_response_code(400);
    if ($debugMode) {
        add_debug_log("Invalid parameters", [
            'ID' => $id,
            'Mode' => $mode,
            'Valid Modes' => ['products', 'inventory', 'inventory-with-fallback']
        ]);
        output_debug_log();
    }
    return_error_image();
}

function get_image_path($id, $type, $basePath) {
    // Get the first 3 digits of the ID by using string padding and substring
    $idPadded = str_pad($id, 6, '0', STR_PAD_LEFT);
    $folder = substr($idPadded, 0, 3);
    return "{$basePath}/images/{$type}/{$folder}/{$id}.webp";
}

// Handle each mode
switch ($mode) {
    case 'products':
        $path = get_image_path($id, 'products', $basePath);
        if ($debugMode) {
            add_debug_log("Checking products image", [
                'Path' => $path,
                'Exists' => file_exists($path)
            ]);
        }
            if (file_exists($path)) {
            if ($debugMode) {
                add_debug_log("Found products image, serving...");
                output_debug_log();
            }
            readfile($path);
            exit;
        }
        break;

    case 'inventory':
        $path = get_image_path($id, 'inventory', $basePath);
        if ($debugMode) {
            add_debug_log("Checking inventory image", [
                'Path' => $path,
                'Exists' => file_exists($path)
            ]);
        }
        if (file_exists($path)) {
            if ($debugMode) {
                add_debug_log("Found inventory image, serving...");
                output_debug_log();
            }
            readfile($path);
            exit;
        }
        break;

    case 'inventory-with-fallback':
        // Try inventory first
        $inventory_path = get_image_path($id, 'inventory', $basePath);
        if ($debugMode) {
            add_debug_log("Checking inventory image with fallback", [
                'Inventory Path' => $inventory_path,
                'Inventory Exists' => file_exists($inventory_path),
                'Product ID' => $product_id
            ]);
        }
        if (file_exists($inventory_path)) {
            if ($debugMode) {
                add_debug_log("Found inventory image, serving...");
                output_debug_log();
            }
            readfile($inventory_path);
            exit;
        }
        
        // Then try product
        if ($product_id) {
            $product_path = get_image_path($product_id, 'product', $basePath);
            if ($debugMode) {
                add_debug_log("Checking product fallback", [
                    'Product Path' => $product_path,
                    'Product Exists' => file_exists($product_path)
                ]);
            }
            if (file_exists($product_path)) {
                if ($debugMode) {
                    add_debug_log("Found product fallback image, serving...");
                    output_debug_log();
                }
                readfile($product_path);
                exit;
            }
        }
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
$placeholderPath = "{$basePath}/images/placeholder.webp";
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