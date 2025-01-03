<?php
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $encryptedPassword = $_POST['password'];
    $publicKey = $_POST['publicKey'];

    // Decrypt password
    $privateKeyPath = __DIR__ . '/private_key.pem';
    $privateKey = file_get_contents($privateKeyPath);
    if ($privateKey === false) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to load private key from ' . $privateKeyPath]);
        exit;
    }
    $privateKeyResource = openssl_pkey_get_private($privateKey);
    if ($privateKeyResource === false) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid private key']);
        exit;
    }
    openssl_private_decrypt(base64_decode($encryptedPassword), $decryptedPassword, $privateKeyResource);

    if ($decryptedPassword === false) {
        echo json_encode(['status' => 'error', 'message' => 'Decryption failed']);
        exit;
    }

    // Hash the password
    $hashedPassword = password_hash($decryptedPassword, PASSWORD_BCRYPT);

    // Insert user into the database
    $stmt = $conn->prepare("INSERT INTO users (username, password, public_key) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $hashedPassword, $publicKey);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Registration failed.']);
    }

    $stmt->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}

$conn->close();
?>
