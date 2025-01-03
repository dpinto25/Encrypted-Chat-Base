<?php
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $username = $_GET['username'];

    $stmt = $conn->prepare("SELECT public_key FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($publicKey);
    $stmt->fetch();

    if ($publicKey) {
        echo json_encode(['publicKey' => $publicKey]);
    } else {
        echo json_encode(['error' => 'Public key not found']);
    }

    $stmt->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}

$conn->close();
?>
