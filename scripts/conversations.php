<?php
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $username = $_GET['username'];

    // Retrieve the list of active conversations
    $stmt = $conn->prepare("SELECT DISTINCT recipient FROM messages WHERE sender = ? UNION SELECT DISTINCT sender FROM messages WHERE recipient = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $conversations[] = $row['recipient'];
    }

    if (empty($conversations)) {
        echo json_encode(['status' => 'no_conversations', 'message' => 'No active conversations']);
    } else {
        echo json_encode($conversations);
    }

    $stmt->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}

$conn->close();
?>
