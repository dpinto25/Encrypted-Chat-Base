<?php
session_start();
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $currentUser = $_GET['currentUser'];
    $selectedUser = $_GET['selectedUser'];

    $stmt = $conn->prepare("SELECT sender, message, time_sent FROM messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY time_sent ASC");
    $stmt->bind_param("ssss", $currentUser, $selectedUser, $selectedUser, $currentUser);
    $stmt->execute();
    $result = $stmt->get_result();

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }

    echo json_encode($messages);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentUser = $_POST['currentUser'];
    $selectedUser = $_POST['selectedUser'];
    $message = $_POST['message'];

    // Retrieve the recipient's public key
    $stmt = $conn->prepare("SELECT public_key FROM users WHERE username = ?");
    $stmt->bind_param("s", $selectedUser);
    $stmt->execute();
    $stmt->bind_result($recipientPublicKey);
    $stmt->fetch();
    $stmt->close();

    if ($recipientPublicKey) {
        // Encrypt the message using the recipient's public key
        $publicKeyResource = openssl_pkey_get_public($recipientPublicKey);
        if ($publicKeyResource === false) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid recipient public key']);
            exit;
        }
        if (!openssl_public_encrypt($message, $encryptedMessage, $publicKeyResource)) {
            echo json_encode(['status' => 'error', 'message' => 'Encryption failed']);
            exit;
        }
        $encryptedMessage = base64_encode($encryptedMessage);

        // Insert the encrypted message into the database
        $stmt = $conn->prepare("INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $currentUser, $selectedUser, $encryptedMessage);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to store message']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Recipient public key not found.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}

$conn->close();
?>
