<?php
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $encryptedUsername = $_POST['username'];
    $encryptedPassword = $_POST['password'];

    // Decrypt username and password
    $privateKeyPath = __DIR__ . '/private_key.pem';
    $privateKey = file_get_contents($privateKeyPath);
    if ($privateKey === false) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to load private key from ' . $privateKeyPath]);
        exit;
    }
    openssl_private_decrypt(base64_decode($encryptedUsername), $username, $privateKey);
    openssl_private_decrypt(base64_decode($encryptedPassword), $password, $privateKey);

    // Log the received username and password
    error_log("Received username: $username");
    error_log("Received password: $password");

    // Check user credentials
    $stmt = $conn->prepare("SELECT password, public_key FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($hashedPassword, $publicKey);
    $stmt->fetch();

    // Log the hashed password from the database
    error_log("Hashed password from DB: $hashedPassword");

    if ($hashedPassword && password_verify($password, $hashedPassword)) {
        echo json_encode(['status' => 'success', 'publicKey' => $publicKey]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Login failed.']);
    }

    $stmt->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}

$conn->close();
?>
