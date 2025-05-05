<?php
// Set error reporting for debugging
ini_set('display_errors', 0); // Don't display errors to user
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/php/logs/php_error.log'); // Adjust path for your XAMPP setup

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$conn = new mysqli('localhost', 'root', 'Sruthi@1978', 'bookmyshow');

// Global error handler
set_error_handler(function ($severity, $message, $file, $line) {
    error_log("PHP Error: [$severity] $message in $file on line $line");
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Check server logs.']);
    exit;
});
set_exception_handler(function ($e) {
    error_log("Exception: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'An internal error occurred. Check server logs.']);
    exit;
});

try {
    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }

    $action = $_GET['action'] ?? '';

    if ($action === 'login') {
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Username and password are required']);
            exit;
        }

        $stmt = $conn->prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('ss', $username, $password);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // Treat both role 1 and role 5 as admin
            $isAdmin = in_array((int)$user['role'], [1, 5]);
            echo json_encode(['success' => true, 'user' => $user, 'isAdmin' => $isAdmin]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        }
        $stmt->close();
    } elseif ($action === 'movies') {
        $result = $conn->query('SELECT id, title, description, trailer_url, poster_url, rating, language, duration, genre, release_date FROM movies');
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        $movies = [];
        while ($row = $result->fetch_assoc()) {
            $movies[] = $row;
        }
        echo json_encode($movies);
    } elseif ($action === 'movie_details') {
        $movie_id = $_GET['movie_id'] ?? 0;
        if (!is_numeric($movie_id) || $movie_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid movie ID']);
            exit;
        }
        $stmt = $conn->prepare('SELECT id, title, description, trailer_url, poster_url, rating, language, duration, genre, release_date FROM movies WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $movie_id);
        $stmt->execute();
        $movie = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$movie) {
            echo json_encode(['success' => false, 'error' => 'Movie not found']);
            exit;
        }
        $stmt = $conn->prepare('SELECT review_text FROM reviews WHERE movie_id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $movie_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $reviews = [];
        while ($row = $result->fetch_assoc()) {
            $reviews[] = $row['review_text'];
        }
        $stmt->close();
        $stmt = $conn->prepare('SELECT t.id, t.name, mt.timing FROM theaters t JOIN movie_theaters mt ON t.id = mt.theater_id WHERE mt.movie_id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $movie_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $theaters = [];
        while ($row = $result->fetch_assoc()) {
            $theater_id = $row['id'];
            if (!isset($theaters[$theater_id])) {
                $theaters[$theater_id] = ['id' => $theater_id, 'name' => $row['name'], 'timings' => []];
            }
            $theaters[$theater_id]['timings'][] = $row['timing'];
        }
        $stmt->close();
        echo json_encode(['success' => true, 'movie' => $movie, 'reviews' => $reviews, 'theaters' => array_values($theaters)]);
    } elseif ($action === 'book') {
        $data = json_decode(file_get_contents('php://input'), true);
        error_log('Received booking data: ' . json_encode($data));
        $user_id = $data['user_id'] ?? 0;
        $movie_id = $data['movie_id'] ?? 0;
        $theater_id = $data['theater_id'] ?? 0;
        $timing = $data['timing'] ?? '';
        $seats = $data['seats'] ?? '';
        $total_cost = $data['total_cost'] ?? 0;
        $booking_date = date('Y-m-d H:i:s');
        if (empty($user_id) || empty($movie_id) || empty($theater_id) || empty($timing) || empty($seats) || $total_cost <= 0) {
            error_log('Invalid booking data: ' . json_encode($data));
            echo json_encode(['success' => false, 'error' => 'Missing or invalid booking data']);
            exit;
        }
        if (!is_numeric($theater_id) || $theater_id <= 0) {
            error_log('Invalid theater_id: ' . $theater_id . ' is not a valid integer');
            echo json_encode(['success' => false, 'error' => 'Invalid theater ID']);
            exit;
        }
        $stmt = $conn->prepare('SELECT id FROM theaters WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $theater_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) {
            error_log('Invalid theater: ' . $theater_id . ' not found in theaters table');
            echo json_encode(['success' => false, 'error' => 'Invalid theater']);
            $stmt->close();
            exit;
        }
        $stmt->close();
        $seatsArray = explode(', ', $seats);
        $stmt = $conn->prepare('SELECT seats FROM bookings WHERE theater_id = ? AND timing = ? AND booking_date LIKE ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $datePattern = date('Y-m-d', strtotime($booking_date)) . '%';
        $stmt->bind_param('iss', $theater_id, $timing, $datePattern);
        $stmt->execute();
        $result = $stmt->get_result();
        $existingBookedSeats = [];
        while ($row = $result->fetch_assoc()) {
            $existingBookedSeats = array_merge($existingBookedSeats, explode(', ', $row['seats']));
        }
        $stmt->close();
        $conflictingSeats = array_intersect($seatsArray, $existingBookedSeats);
        if (!empty($conflictingSeats)) {
            echo json_encode(['success' => false, 'error' => 'Some seats are already booked: ' . implode(', ', $conflictingSeats)]);
            exit;
        }
        $stmt = $conn->prepare('INSERT INTO bookings (user_id, movie_id, theater_id, timing, seats, total_cost, booking_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('iiissds', $user_id, $movie_id, $theater_id, $timing, $seats, $total_cost, $booking_date);
        if ($stmt->execute()) {
            error_log('Booking successful for user_id: ' . $user_id . ', movie_id: ' . $movie_id . ', theater_id: ' . $theater_id);
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Booking failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'add_movie') {
        $data = json_decode(file_get_contents('php://input'), true);
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $trailer_url = $data['trailer_url'] ?? '';
        $poster_url = $data['poster_url'] ?? '';
        $rating = $data['rating'] ?? 0.0;
        $language = $data['language'] ?? '';
        $duration = $data['duration'] ?? '';
        $genre = $data['genre'] ?? '';
        $release_date = $data['release_date'] ?? date('Y-m-d');
        if (empty($title) || empty($description)) {
            echo json_encode(['success' => false, 'error' => 'Title and description are required']);
            exit;
        }
        $stmt = $conn->prepare('INSERT INTO movies (title, description, trailer_url, poster_url, rating, language, duration, genre, release_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('sssddssss', $title, $description, $trailer_url, $poster_url, $rating, $language, $duration, $genre, $release_date);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            throw new Exception('Insert failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'update_movie') {
        $data = json_decode(file_get_contents('php://input'), true);
        $movie_id = $data['id'] ?? 0;
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $trailer_url = $data['trailer_url'] ?? '';
        $poster_url = $data['poster_url'] ?? '';
        $rating = $data['rating'] ?? 0.0;
        $language = $data['language'] ?? '';
        $duration = $data['duration'] ?? '';
        $genre = $data['genre'] ?? '';
        $release_date = $data['release_date'] ?? date('Y-m-d');
        if (!is_numeric($movie_id) || $movie_id <= 0 || empty($title) || empty($description)) {
            echo json_encode(['success' => false, 'error' => 'Invalid movie ID or missing required fields']);
            exit;
        }
        $stmt = $conn->prepare('UPDATE movies SET title = ?, description = ?, trailer_url = ?, poster_url = ?, rating = ?, language = ?, duration = ?, genre = ?, release_date = ? WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('sssddssssi', $title, $description, $trailer_url, $poster_url, $rating, $language, $duration, $genre, $release_date, $movie_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Update failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'delete_movie') {
        $movie_id = $_GET['movie_id'] ?? 0;
        if (!is_numeric($movie_id) || $movie_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid movie ID']);
            exit;
        }
        $stmt = $conn->prepare('DELETE FROM movies WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $movie_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Delete failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'theaters') {
        $result = $conn->query('SELECT id, name FROM theaters');
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        $theaters = [];
        while ($row = $result->fetch_assoc()) {
            $theaters[] = $row;
        }
        echo json_encode($theaters);
    } elseif ($action === 'add_theater') {
        $data = json_decode(file_get_contents('php://input'), true);
        $name = $data['name'] ?? '';
        if (empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Theater name is required']);
            exit;
        }
        $stmt = $conn->prepare('INSERT INTO theaters (name) VALUES (?)');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('s', $name);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            throw new Exception('Insert failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'update_theater') {
        $data = json_decode(file_get_contents('php://input'), true);
        $theater_id = $data['id'] ?? 0;
        $name = $data['name'] ?? '';
        if (!is_numeric($theater_id) || $theater_id <= 0 || empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Invalid theater ID or missing name']);
            exit;
        }
        $stmt = $conn->prepare('UPDATE theaters SET name = ? WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('si', $name, $theater_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Update failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'delete_theater') {
        $theater_id = $_GET['theater_id'] ?? 0;
        if (!is_numeric($theater_id) || $theater_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid theater ID']);
            exit;
        }
        $stmt = $conn->prepare('DELETE FROM theaters WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $theater_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Delete failed: ' . $conn->error);
        }
        $stmt->close();
    } elseif ($action === 'bookings') {
        $result = $conn->query('SELECT b.id, b.user_id, b.movie_id, b.theater_id, b.timing, b.seats, b.total_cost, b.booking_date, m.title AS movie_title, t.name AS theater_name, u.username FROM bookings b JOIN movies m ON b.movie_id = m.id JOIN theaters t ON b.theater_id = t.id JOIN users u ON b.user_id = u.id');
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        $bookings = [];
        while ($row = $result->fetch_assoc()) {
            $bookings[] = $row;
        }
        echo json_encode($bookings);
    } elseif ($action === 'users') {
        $result = $conn->query('SELECT id, username, role FROM users');
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        echo json_encode($users);
    } elseif ($action === 'delete_user') {
        $user_id = $_GET['user_id'] ?? 0;
        if (!is_numeric($user_id) || $user_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid user ID']);
            exit;
        }
        $stmt = $conn->prepare('DELETE FROM users WHERE id = ?');
        if (!$stmt) {
            throw new Exception('Prepare failed: ' . $conn->error);
        }
        $stmt->bind_param('i', $user_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('Delete failed: ' . $conn->error);
        }
        $stmt->close();
    }
} catch (Exception $e) {
    error_log('Exception in api.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'An internal error occurred: ' . $e->getMessage()]);
}

$conn->close();
?>