$(document).ready(function() {
    let publicKey, privateKey, currentUser, selectedUser;

    function generateKeyPair() {
        const crypt = new JSEncrypt({ default_key_size: 2048 });
        crypt.getKey();
        publicKey = crypt.getPublicKey();
        privateKey = crypt.getPrivateKey();
        $('#publicKey').val(publicKey);
        localStorage.setItem('privateKey', privateKey); // Store the private key locally
    }

    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#regUsername').val();
        const password = $('#regPassword').val();
        generateKeyPair();
        const encrypt = new JSEncrypt();
        encrypt.setPublicKey(publicKey);
        const encryptedPassword = encrypt.encrypt(password);
        if (!encryptedPassword) {
            alert('Encryption failed. Please try again.');
            return;
        }
        $.post('register.php', { username: username, password: btoa(encryptedPassword), publicKey: publicKey }, function(response) {
            try {
                const result = JSON.parse(response);
                if (result.status === 'success') {
                    alert('Registration successful. Please login.');
                    $('#registerForm')[0].reset();
                } else {
                    alert('Registration failed. Please try again.');
                }
            } catch (e) {
                console.error('Error parsing JSON:', response);
                alert('An error occurred. Please try again.');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error in AJAX request:', textStatus, errorThrown);
            console.error('Response:', jqXHR.responseText);
            alert('An error occurred. Please try again.');
        });
    });

    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val();
        const password = $('#password').val();
        // Retrieve the user's public key from the server
        $.get('users.php', { username: username }, function(response) {
            try {
                const result = JSON.parse(response);
                if (result.publicKey) {
                    publicKey = result.publicKey;
                    const encrypt = new JSEncrypt();
                    encrypt.setPublicKey(publicKey);
                    const encryptedPassword = encrypt.encrypt(password);
                    if (!encryptedPassword) {
                        alert('Encryption failed. Please try again.');
                        return;
                    }
                    $.post('login.php', { username: username, password: btoa(encryptedPassword) }, function(response) {
                        try {
                            const result = JSON.parse(response);
                            if (result.status === 'success') {
                                currentUser = username;
                                privateKey = localStorage.getItem('privateKey'); // Retrieve the private key from local storage
                                $('#registerForm').hide();
                                $('#loginForm').hide();
                                $('#chatContainer').show();
                                loadActiveConversations();
                            } else {
                                alert('Login failed. Please try again.');
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', response);
                            alert('An error occurred. Please try again.');
                        }
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.error('Error in AJAX request:', textStatus, errorThrown);
                        console.error('Response:', jqXHR.responseText);
                        alert('An error occurred. Please try again.');
                    });
                } else {
                    alert('Public key not found. Please try again.');
                }
            } catch (e) {
                console.error('Error parsing JSON:', response);
                alert('An error occurred. Please try again.');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error in AJAX request:', textStatus, errorThrown);
            console.error('Response:', jqXHR.responseText);
            alert('An error occurred. Please try again.');
        });
    });

    function loadActiveConversations() {
        $.get('conversations.php', { username: currentUser }, function(response) {
            try {
                const result = JSON.parse(response);
                $('#conversationList').empty();
                if (result.status === 'no_conversations') {
                    $('#conversationList').append('<li class="list-group-item">' + result.message + '</li>');
                } else {
                    result.forEach(conversation => {
                        $('#conversationList').append('<li class="list-group-item conversation-item">' + conversation + '</li>');
                    });
                }
            } catch (e) {
                console.error('Error parsing JSON:', response);
                alert('An error occurred. Please try again.');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error in AJAX request:', textStatus, errorThrown);
            console.error('Response:', jqXHR.responseText);
            alert('An error occurred. Please try again.');
        });
    }

    $('#conversationList').on('click', '.conversation-item', function() {
        selectedUser = $(this).text();
        $('#messages').empty();
        loadMessages();
    });

    function loadMessages() {
        $.get('messages.php', { currentUser: currentUser, selectedUser: selectedUser }, function(response) {
            try {
                const messages = JSON.parse(response);
                messages.forEach(message => {
                    const decryptedMessage = decryptMessage(message.message);
                    $('#messages').append('<div><strong>' + message.sender + ':</strong> ' + decryptedMessage + ' <em>(' + message.time_sent + ')</em></div>');
                });
            } catch (e) {
                console.error('Error parsing JSON:', response);
                alert('An error occurred. Please try again.');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error in AJAX request:', textStatus, errorThrown);
            console.error('Response:', jqXHR.responseText);
            alert('An error occurred. Please try again.');
        });
    }

    $('#messageForm').on('submit', function(e) {
        e.preventDefault();
        const recipient = $('#recipient').val();
        const message = $('#message').val();
        if (!recipient) {
            alert('Please enter a recipient username.');
            return;
        }
        // Retrieve the recipient's public key
        $.get('users.php', { username: recipient }, function(response) {
            try {
                const result = JSON.parse(response);
                if (result.publicKey) {
                    const encrypt = new JSEncrypt();
                    encrypt.setPublicKey(result.publicKey);
                    const encryptedMessage = encrypt.encrypt(message);
                    if (!encryptedMessage) {
                        alert('Encryption failed. Please try again.');
                        return;
                    }
                    $.post('messages.php', { currentUser: currentUser, selectedUser: recipient, message: encryptedMessage }, function(response) {
                        try {
                            const result = JSON.parse(response);
                            if (result.status === 'success') {
                                $('#messages').append('<div><strong>' + currentUser + ':</strong> ' + message + ' <em>(just now)</em></div>');
                                $('#message').val('');
                            } else {
                                alert('Message sending failed. Please try again.');
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', response);
                            alert('An error occurred. Please try again.');
                        }
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.error('Error in AJAX request:', textStatus, errorThrown);
                        console.error('Response:', jqXHR.responseText);
                        alert('An error occurred. Please try again.');
                    });
                } else {
                    alert('Recipient public key not found.');
                }
            } catch (e) {
                console.error('Error parsing JSON:', response);
                alert('An error occurred. Please try again.');
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error in AJAX request:', textStatus, errorThrown);
            console.error('Response:', jqXHR.responseText);
            alert('An error occurred. Please try again.');
        });
    });

    $('#generateKeys').on('click', function() {
        generateKeyPair();
    });

    // Function to decrypt messages
    function decryptMessage(encryptedMessage) {
        if (!encryptedMessage) {
            console.error('Encrypted message is empty');
            return 'Decryption failed';
        }
        const decrypt = new JSEncrypt();
        decrypt.setPrivateKey(privateKey);
        const decrypted = decrypt.decrypt(encryptedMessage);
        if (decrypted === false) {
            console.error('Decryption failed for message:', encryptedMessage);
            return 'Decryption failed';
        }
        return decrypted;
    }

    // Example of decrypting a message
    $('#messages').on('click', 'div', function() {
        const encryptedMessage = $(this).text();
        const decryptedMessage = decryptMessage(encryptedMessage);
        if (decryptedMessage) {
            $(this).text(decryptedMessage);
        } else {
            alert('Decryption failed. Please try again.');
        }
    });
});
