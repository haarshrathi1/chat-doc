const socket = io();

// Get user type (doctor or patient) based on the URL path
const userType = window.location.pathname.includes('doctor') ? 'doctor' : 'patient';

// Handle chat form submission
document.getElementById('chat-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (message) {
        // Emit the message with the user type (doctor or patient)
        socket.emit('chat message', { user: userType, message: message });
        messageInput.value = ''; // Clear input after sending
    }
});

// Listen for incoming messages and place them accordingly (sender or receiver)
socket.on('chat message', function(data) {
    const messages = document.getElementById('messages');
    const newMessage = document.createElement('li');

    // Check if the current user is the sender
    if (data.user === userType) {
        newMessage.classList.add('sender'); // Right-aligned for sender
    } else {
        newMessage.classList.add('receiver'); // Left-aligned for receiver
    }

    // Display the message and user type (doctor or patient)
    newMessage.textContent = `${data.user === 'doctor' ? 'Doctor' : 'Patient'}: ${data.message}`;
    messages.appendChild(newMessage);

    // Auto scroll to the bottom of the chat
    messages.scrollTop = messages.scrollHeight;
});

// Listen for prescription upload event
socket.on('prescription uploaded', function(data) {
    const messages = document.getElementById('messages');
    const newMessage = document.createElement('li');
    newMessage.classList.add('receiver'); // Always a receiver message for the patient

    // Display download link for patient
    newMessage.innerHTML = `Doctor: ${data.message} <a href="/uploads/${data.filename}" target="_blank">Download prescription</a>`;
    messages.appendChild(newMessage);

    // Auto scroll to the bottom of the chat
    messages.scrollTop = messages.scrollHeight;
});

// Handle prescription upload form submission (only for doctors)
if (document.getElementById('upload-form')) {
    document.getElementById('upload-form').addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(this); // Prepare form data
        const xhr = new XMLHttpRequest();

        xhr.open('POST', '/upload-prescription', true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                alert('Prescription uploaded successfully.');
                // Optionally, display a message in the doctor's chat
                const messages = document.getElementById('messages');
                const newMessage = document.createElement('li');
                newMessage.classList.add('sender');
                newMessage.textContent = 'Doctor: Prescription uploaded.';
                messages.appendChild(newMessage);
                messages.scrollTop = messages.scrollHeight; // Auto scroll
            } else {
                alert('Error uploading prescription.');
            }
        };

        xhr.send(formData); // Send form data
    });
}
