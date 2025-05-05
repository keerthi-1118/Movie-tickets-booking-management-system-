let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
if (currentUser && !currentUser.id) {
    console.warn('currentUser loaded but missing id, logging out');
    currentUser = null;
    localStorage.removeItem('currentUser');
}
let selectedMovie = JSON.parse(localStorage.getItem('selectedMovie')) || null;
let selectedTheater = JSON.parse(localStorage.getItem('selectedTheater')) || null;
let selectedTiming = JSON.parse(localStorage.getItem('selectedTiming')) || null;
let selectedSeats = JSON.parse(localStorage.getItem('selectedSeats')) || [];
let selectedDate = JSON.parse(localStorage.getItem('selectedDate')) || new Date().toISOString().split('T')[0];
let maxTickets = parseInt(localStorage.getItem('maxTickets')) || 6;

// Static theater data for all movies, aligned with database IDs (1-based index)
const theatersData = [
    {
        name: 'Mythri Cinemas',
        timings: ['07:00 PM', '10:00 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Hindi-2D', 'Telugu-2D']
    },
    {
        name: 'Naaz Cinemas',
        timings: ['03:00 PM', '06:00 PM', '09:00 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Hindi-2D', 'English-2D']
    },
    {
        name: 'Hollywood Bollywood Theaters',
        timings: ['02:30 PM', '05:30 PM', '08:30 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Hindi-2D', 'English-2D']
    },
    {
        name: 'Plateno Cinemas',
        timings: ['04:00 PM', '07:00 PM', '10:30 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Telugu-2D', 'English-2D']
    },
    {
        name: 'Capital Cinemas',
        timings: ['01:00 PM', '04:30 PM', '07:30 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Hindi-2D', 'Telugu-2D']
    },
    {
        name: 'Cinepolis Power One Mall',
        timings: ['03:15 PM', '06:15 PM', '09:15 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['English-2D', 'Hindi-2D']
    },
    {
        name: 'PVR Ripples Mall',
        timings: ['02:00 PM', '05:00 PM', '08:00 PM'],
        features: ['m-Ticket', 'Food & Beverage', 'Cancellation available'],
        languages: ['Telugu-2D', 'Hindi-2D']
    }
];

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    fetch('http://localhost:8080/web_project/backend/api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Login response:', data); // Debug log
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (data.isAdmin) {
                console.log('User is admin, redirecting to admin.html');
                window.location.href = 'admin.html';
            } else {
                console.log('User is not admin, redirecting to home.html');
                loadPreviousSelections();
                window.location.href = 'home.html';
            }
        } else {
            message.textContent = data.error;
        }
    })
    .catch(error => console.error('Login error:', error));
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function loadMovies() {
    fetch('http://localhost:8080/web_project/backend/api.php?action=movies')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
        return response.json();
    })
    .then(movies => {
        console.log('Movies fetched:', movies);
        const moviesDiv = document.getElementById('movies');
        if (!moviesDiv) console.error('Movies div not found');
        moviesDiv.innerHTML = '';

        const initialMovies = movies.slice(0, 5);
        initialMovies.forEach(movie => {
            const div = document.createElement('div');
            div.className = 'movie-card';
            const posterUrl = movie.poster_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(movie.title)}`;
            div.innerHTML = `<img src="${posterUrl}" alt="${movie.title}">
                             <p>${movie.title}</p>
                             <p>Rating: ${movie.rating || 'N/A'}/10</p>
                             <button onclick="selectMovie(${movie.id})">Book</button>`;
            moviesDiv.appendChild(div);
        });

        const seeAllButton = document.createElement('button');
        seeAllButton.textContent = 'See All';
        seeAllButton.className = 'see-all-btn';
        seeAllButton.onclick = () => {
            moviesDiv.innerHTML = '';
            movies.forEach(movie => {
                const div = document.createElement('div');
                div.className = 'movie-card';
                const posterUrl = movie.poster_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(movie.title)}`;
                div.innerHTML = `<img src="${posterUrl}" alt="${movie.title}">
                                 <p>${movie.title}</p>
                                 <p>Rating: ${movie.rating || 'N/A'}/10</p>
                                 <button onclick="selectMovie(${movie.id})">Book</button>`;
                moviesDiv.appendChild(div);
            });
        };
        moviesDiv.appendChild(seeAllButton);

        const userElement = document.getElementById('user');
        if (userElement) userElement.textContent = currentUser ? currentUser.username : '';
        else console.error('User element not found');
    })
    .catch(error => console.error('Movies load error:', error));
}

function loadAllMovies() {
    loadMovies();
}

function selectMovie(movieId) {
    console.log('Starting selectMovie for movieId:', movieId);
    fetch(`http://localhost:8080/web_project/backend/api.php?action=movie_details&movie_id=${movieId}`)
    .then(response => {
        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('Movie details fetched:', data);
        if (data.error) {
            console.error('API error:', data.error);
            return;
        }
        if (!data.movie) {
            console.error('No movie data in response:', data);
            return;
        }
        selectedMovie = data.movie;
        localStorage.setItem('selectedMovie', JSON.stringify(selectedMovie));
        console.log('Movie saved to localStorage:', selectedMovie);
        const savedMovie = JSON.parse(localStorage.getItem('selectedMovie'));
        console.log('Verified from localStorage:', savedMovie);
        if (!savedMovie) {
            console.error('LocalStorage verification failed, movie data not saved correctly');
        }
        window.location.href = 'movie_details.html';
    })
    .catch(error => console.error('Select movie error:', error));
}

function loadMovieDetails() {
    if (window.location.pathname.includes('movie_details.html')) {
        console.log('Loading details from localStorage on movie_details.html');
        const storedMovie = JSON.parse(localStorage.getItem('selectedMovie'));
        console.log('Stored movie from localStorage:', storedMovie);
        if (storedMovie && storedMovie.id) {
            fetch(`http://localhost:8080/web_project/backend/api.php?action=movie_details&movie_id=${storedMovie.id}`)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
                    return response.json();
                })
                .then(data => {
                    console.log('Detailed movie data fetched:', data);
                    if (data.error) {
                        console.error('API error:', data.error);
                        return;
                    }
                    if (!data.movie) {
                        console.error('No movie data in response:', data);
                        return;
                    }
                    const movie = data.movie;
                    const titleElement = document.getElementById('movieTitle');
                    const descElement = document.getElementById('movieDescription');
                    const posterElement = document.getElementById('moviePoster');
                    const ratingElement = document.getElementById('movieRating');
                    const languageElement = document.getElementById('movieLanguage');
                    const durationElement = document.getElementById('movieDuration');
                    const genreElement = document.getElementById('movieGenre');
                    const releaseDateElement = document.getElementById('movieReleaseDate');
                    const trailerElement = document.getElementById('trailer');
                    const bookBtn = document.getElementById('bookTicketBtn');

                    if (!titleElement || !descElement || !posterElement || !ratingElement || !languageElement || !durationElement || !genreElement || !releaseDateElement || !trailerElement || !bookBtn) {
                        console.error('Missing DOM elements:', {
                            title: titleElement,
                            desc: descElement,
                            poster: posterElement,
                            rating: ratingElement,
                            language: languageElement,
                            duration: durationElement,
                            genre: genreElement,
                            releaseDate: releaseDateElement,
                            trailer: trailerElement,
                            bookBtn: bookBtn
                        });
                        return;
                    }

                    titleElement.textContent = movie.title || 'No Title';
                    descElement.textContent = movie.description || 'No Description';
                    posterElement.src = movie.poster_url || 'https://via.placeholder.com/200x300';
                    ratingElement.textContent = `Rating: ${movie.rating || 'N/A'}/10`;
                    languageElement.textContent = `Language: ${movie.language || 'N/A'}`;
                    durationElement.textContent = `Duration: ${movie.duration || 'N/A'}`;
                    genreElement.textContent = `Genre: ${movie.genre || 'N/A'}`;
                    releaseDateElement.textContent = `Release Date: ${movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-GB') : 'N/A'}`;
                    const trailerId = (movie.trailer_url || '').split('?')[0].replace('https://youtu.be/', '') || '';
                    trailerElement.src = trailerId ? `https://www.youtube.com/embed/${trailerId}` : '';
                    bookBtn.onclick = bookTicket;
                    console.log('Details loaded for:', movie.title);
                })
                .catch(error => console.error('Movie details load error:', error));
        } else {
            console.error('No valid movie in localStorage:', storedMovie);
        }
    }
}

function loadTheaters() {
    if (window.location.pathname.includes('theater_selection.html')) {
        const storedMovie = JSON.parse(localStorage.getItem('selectedMovie'));
        if (!storedMovie || !storedMovie.title) {
            console.error('No valid movie selected:', storedMovie);
            return;
        }

        const language = document.getElementById('language')?.value || 'Hindi';
        const preferredTime = document.getElementById('preferredTime')?.value || '';
        document.getElementById('movieTitle').textContent = `${storedMovie.title} (${language}) (UA16+ - Action, Drama)`;

        const theatersDiv = document.getElementById('theaters');
        if (!theatersDiv) {
            console.error('Theaters div not found');
            return;
        }
        theatersDiv.innerHTML = '';

        const group1 = theatersData.slice(0, 4);
        const group2 = theatersData.slice(4, 7);

        [group1, group2].forEach((group, index) => {
            if (group.length > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'theater-group';
                group.forEach(theater => {
                    const div = document.createElement('div');
                    div.className = 'theater-item';
                    div.innerHTML = `
                        <div class="theater-header">
                            <span class="theater-name">${theater.name}</span>
                            <span class="info-icon">ℹ️</span>
                        </div>
                        <div class="timing-options">
                            ${theater.timings.map(timing => `
                                <button class="timing-btn" data-date="${selectedDate}" onclick="selectTiming('${theater.name}', '${timing}')">${timing}</button>
                            `).join('')}
                        </div>
                        <div class="theater-features">
                            ${theater.features.map(feature => `<span>${feature === 'm-Ticket' ? '📱' : feature === 'Food & Beverage' ? '🍕' : '🔄'} ${feature}</span>`).join(' ')}
                        </div>
                    `;
                    groupDiv.appendChild(div);
                });
                theatersDiv.appendChild(groupDiv);
            }
        });
    }
}

function selectTiming(theaterName, timing) {
    const theater = theatersData.find(t => t.name === theaterName);
    selectedTheater = { name: theaterName, id: theatersData.findIndex(t => t.name === theaterName) + 1 }; // Use ID (1-based)
    selectedTiming = timing;
    if (event && event.target.dataset.date && event.target.dataset.date !== selectedDate) {
        selectedDate = event.target.dataset.date;
    }
    console.log('Selected theater:', selectedTheater, 'Timing:', timing, 'Date:', selectedDate, 'Current selectedMovie:', selectedMovie);

    if (currentUser && currentUser.id) {
        const userSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`)) || {};
        userSelections[theaterName] = { timing, date: selectedDate, seats: [] };
        localStorage.setItem(`selections_${currentUser.id}`, JSON.stringify(userSelections));
        localStorage.setItem('selectedTheater', JSON.stringify(selectedTheater));
        localStorage.setItem('selectedTiming', JSON.stringify(selectedTiming));
        localStorage.setItem('selectedDate', JSON.stringify(selectedDate));
        const verifiedSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`));
        console.log('Selections saved to localStorage:', verifiedSelections);
    }

    document.querySelectorAll('.timing-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    window.location.href = 'ticket_selection.html';
}

function loadTicketSelection() {
    if (window.location.pathname.includes('ticket_selection.html')) {
        const ticketDiv = document.getElementById('ticket-selection');
        if (!ticketDiv) {
            console.error('Ticket selection div not found');
            return;
        }
        ticketDiv.innerHTML = `
            <div class="ticket-popup">
                <h2>How Many Seats?</h2>
                <div class="ticket-options">
                    ${[1, 2, 3, 4, 5, 6].map(num => `
                        <button class="ticket-btn ${num === 2 ? 'selected' : ''}" onclick="selectTicketCount(${num})">${num}</button>
                    `).join('')}
                </div>
                <div class="pricing-options">
                    <span>Prime Plus Rs. 260 <span class="status">Available</span></span>
                    <span>Prime Rs. 230 <span class="status">Available</span></span>
                    <span>Classic Rs. 170 <span class="status">Available</span></span>
                </div>
                <div class="button-container">
                    <button class="back-btn" onclick="goBack()">Back</button>
                    <button class="select-seats-btn" onclick="proceedToSeats()">Select Seats</button>
                </div>
            </div>
        `;
        maxTickets = parseInt(localStorage.getItem('maxTickets')) || 2;
        document.querySelectorAll('.ticket-btn').forEach(btn => {
            if (parseInt(btn.textContent) === maxTickets) btn.classList.add('selected');
        });
        console.log('Loaded ticket selection with maxTickets:', maxTickets, 'Current selectedMovie:', selectedMovie, 'selectedTheater:', selectedTheater, 'selectedTiming:', selectedTiming, 'selectedDate:', selectedDate);
    }
}

function selectTicketCount(num) {
    maxTickets = num;
    localStorage.setItem('maxTickets', num);
    document.querySelectorAll('.ticket-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    console.log('Selected maxTickets:', maxTickets, 'Current selectedMovie:', selectedMovie);
}

function proceedToSeats() {
    if (maxTickets > 0) {
        window.location.href = 'seat_selection.html';
    } else {
        alert('Please select the number of tickets.');
    }
}

function proceed() {
    if (selectedTheater && selectedTiming && selectedDate) {
        window.location.href = 'ticket_selection.html';
    } else {
        alert('Please select a theater, timing, and date first.');
    }
}

function bookTicket() {
    window.location.href = 'theater_selection.html';
}

function loadSeats() {
    if (window.location.pathname.includes('seat_selection.html')) {
        let loadCount = (localStorage.getItem('loadSeatsCount') || 0) + 1;
        localStorage.setItem('loadSeatsCount', loadCount);
        console.log(`Loading seats - Attempt #${loadCount} with selectedMovie:`, selectedMovie, 'selectedTheater:', selectedTheater, 'selectedTiming:', selectedTiming, 'selectedSeats:', selectedSeats, 'selectedDate:', selectedDate);

        selectedTheater = JSON.parse(localStorage.getItem('selectedTheater')) || null;
        selectedTiming = JSON.parse(localStorage.getItem('selectedTiming')) || null;
        selectedSeats = JSON.parse(localStorage.getItem('selectedSeats')) || [];
        selectedDate = JSON.parse(localStorage.getItem('selectedDate')) || new Date().toISOString().split('T')[0];

        const seatsDiv = document.getElementById('seats');
        if (!seatsDiv) {
            console.error('Seats div not found in seat_selection.html. Ensure <div id="seats"></div> exists.');
            return;
        }
        seatsDiv.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'seat-header';
        header.innerHTML = `
            <h2>${selectedMovie ? selectedMovie.title : 'Movie Title'} - ${selectedTheater ? selectedTheater.name : 'Theater Name'}, ${selectedDate} ${selectedTiming || 'Time'}</h2>
        `;
        seatsDiv.appendChild(header);

        const title = document.createElement('h2');
        title.textContent = 'Select Seats';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        seatsDiv.appendChild(title);

        if (currentUser && currentUser.id && selectedTheater) {
            const userSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`)) || {};
            const previousSelection = userSelections[selectedTheater.name] || { seats: [] };
            selectedSeats = [...previousSelection.seats];
            let bookedSeats = JSON.parse(localStorage.getItem('bookedSeats') || '{}')[`${selectedTheater.name}_${selectedDate}_${selectedTiming}`] || [];
            renderSeatLayout(seatsDiv, bookedSeats);
        } else {
            renderSeatLayout(seatsDiv, []);
        }

        const instruction = document.createElement('p');
        instruction.textContent = 'All eyes this way please!';
        instruction.style.textAlign = 'center';
        instruction.style.margin = '10px 0';
        seatsDiv.appendChild(instruction);
    }
}

function renderSeatLayout(seatsDiv, bookedSeats) {
    if (!seatsDiv) return;

    const seatBlocks = [
        { name: 'Platinum', rows: ['A'], seatsPerRow: 15, price: 250 },
        { name: 'Gold', rows: ['B', 'C', 'D', 'E', 'F', 'G'], seatsPerRow: 15, price: 200 },
        { name: 'Silver', rows: ['H', 'I', 'J', 'K'], seatsPerRow: 15, price: 175 }
    ];

    seatBlocks.forEach(block => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'seat-block';

        const blockTitle = document.createElement('h3');
        blockTitle.textContent = `Rs. ${block.price} ${block.name}`;
        blockDiv.appendChild(blockTitle);

        const seatsContainer = document.createElement('div');
        seatsContainer.className = 'seats-container';

        block.rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';

            const rowLabel = document.createElement('span');
            rowLabel.textContent = row;
            rowDiv.appendChild(rowLabel);

            const seatsRow = document.createElement('div');
            seatsRow.className = 'seat-buttons';

            for (let seatNum = 1; seatNum <= block.seatsPerRow; seatNum++) {
                const seatId = `${row}${seatNum}`;
                const button = document.createElement('button');
                button.textContent = seatNum;
                button.dataset.seat = seatId;
                button.className = 'seat-button';

                if (selectedSeats.includes(seatId)) {
                    button.classList.add('selected');
                }
                if (bookedSeats.includes(seatId)) {
                    button.classList.add('booked');
                    button.disabled = true;
                } else {
                    button.onclick = () => toggleSeat(seatId);
                }

                seatsRow.appendChild(button);
            }
            rowDiv.appendChild(seatsRow);
            seatsContainer.appendChild(rowDiv);
        });

        blockDiv.appendChild(seatsContainer);
        seatsDiv.appendChild(blockDiv);
    });

    const legendDiv = document.createElement('div');
    legendDiv.style.display = 'flex';
    legendDiv.style.justifyContent = 'center';
    legendDiv.style.margin = '10px 0';
    legendDiv.innerHTML = `
        <span style="margin: 0 10px;">🌱 Available</span>
        <span style="margin: 0 10px;">✔ Selected</span>
        <span style="margin: 0 10px;">🚫 Booked</span>
    `;
    seatsDiv.appendChild(legendDiv);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.marginTop = '20px';
    buttonContainer.innerHTML = `
        <button onclick="goBack()" style="padding: 10px 20px; margin: 0 10px; background-color: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer;">Back</button>
        <button onclick="confirmSeats()" style="padding: 10px 20px; margin: 0 10px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Proceed</button>
    `;
    seatsDiv.appendChild(buttonContainer);
}

const style = document.createElement('style');
style.textContent = `
    .seat-button {
        width: 30px;
        height: 30px;
        margin: 2px;
        background-color: #fff;
        border: 1px solid #ccc;
        cursor: pointer;
    }
    .seat-button.selected {
        background-color: #28a745;
        color: white;
    }
    .seat-button.booked {
        background-color: #808080;
        color: #fff;
        cursor: not-allowed;
    }
    .seat-button:disabled {
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

function toggleSeat(seatId) {
    console.log('Toggling seat:', seatId, 'Current selectedSeats:', selectedSeats, 'Max Tickets:', maxTickets);
    let seatSelected = false;

    const buttons = document.querySelectorAll('.seat-button');
    buttons.forEach(btn => {
        if (btn.dataset.seat === seatId) {
            if (!selectedSeats.includes(seatId) && selectedSeats.length < maxTickets && !btn.classList.contains('booked')) {
                selectedSeats.push(seatId);
                btn.classList.add('selected');
                seatSelected = true;
                console.log('Seat added, new selectedSeats:', selectedSeats);
            } else if (selectedSeats.includes(seatId)) {
                selectedSeats = selectedSeats.filter(s => s !== seatId);
                btn.classList.remove('selected');
                console.log('Seat removed, new selectedSeats:', selectedSeats);
            }
        }
    });

    if (!seatSelected && selectedSeats.length >= maxTickets) {
        alert(`You can select up to ${maxTickets} seats only.`);
    }

    let bookedSeats = [];
    if (selectedTheater && selectedTheater.name && selectedTiming) {
        bookedSeats = JSON.parse(localStorage.getItem('bookedSeats') || '{}')[`${selectedTheater.name}_${selectedDate}_${selectedTiming}`] || [];
    }
    updateSeatStates(buttons, bookedSeats);
    localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
}

function updateSeatStates(buttons, bookedSeats) {
    buttons.forEach(btn => {
        const seatId = btn.dataset.seat;
        btn.classList.toggle('selected', selectedSeats.includes(seatId));
        if (bookedSeats.includes(seatId)) {
            btn.classList.add('booked');
            btn.disabled = true;
        } else {
            btn.classList.remove('booked');
            btn.disabled = false;
        }
    });
}

function confirmSeats() {
    console.log('Starting confirmSeats with current data:', { selectedMovie, selectedTheater, selectedTiming, selectedDate, selectedSeats });
    try {
        if (selectedSeats.length > 0 && selectedSeats.length <= maxTickets) {
            if (currentUser && currentUser.id && selectedTheater) {
                const userSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`)) || {};
                userSelections[selectedTheater.name] = {
                    timing: selectedTiming,
                    date: selectedDate,
                    seats: selectedSeats
                };
                localStorage.setItem(`selections_${currentUser.id}`, JSON.stringify(userSelections));
                const verifiedSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`));
                console.log('Selections saved to localStorage:', verifiedSelections);

                localStorage.setItem('selectedMovie', JSON.stringify(selectedMovie));
                localStorage.setItem('selectedTheater', JSON.stringify(selectedTheater));
                localStorage.setItem('selectedTiming', JSON.stringify(selectedTiming));
                localStorage.setItem('selectedDate', JSON.stringify(selectedDate));
                localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));

                let allBookings = JSON.parse(localStorage.getItem('bookedSeats') || '{}');
                const bookingKey = `${selectedTheater.name}_${selectedDate}_${selectedTiming}`;
                allBookings[bookingKey] = [...(allBookings[bookingKey] || []), ...selectedSeats];
                localStorage.setItem('bookedSeats', JSON.stringify(allBookings));

                console.log('All data saved to localStorage before redirect:', {
                    selectedMovie,
                    selectedTheater,
                    selectedTiming,
                    selectedDate,
                    selectedSeats
                });
                window.location.href = 'confirmation.html';
            } else {
                console.error('Missing required data:', { currentUser, selectedTheater });
                alert('Cannot proceed: User or theater data is missing.');
            }
        } else {
            alert(`Please select between 1 and ${maxTickets} seats`);
        }
    } catch (error) {
        console.error('Error in confirmSeats:', error);
        alert('An error occurred while confirming seats. Check the console for details.');
    }
}

function loadConfirmation() {
    console.log('Starting loadConfirmation');
    if (window.location.pathname.includes('confirmation.html')) {
        selectedMovie = JSON.parse(localStorage.getItem('selectedMovie')) || { title: 'Fallback Title', id: 0 };
        selectedTheater = JSON.parse(localStorage.getItem('selectedTheater')) || { name: 'No Theater Selected' };
        selectedTiming = JSON.parse(localStorage.getItem('selectedTiming')) || 'No Timing Selected';
        selectedDate = JSON.parse(localStorage.getItem('selectedDate')) || new Date().toISOString().split('T')[0];
        selectedSeats = JSON.parse(localStorage.getItem('selectedSeats')) || [];

        if (currentUser && currentUser.id) {
            const userSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`)) || {};
            const theaterName = selectedTheater.name;
            const selection = userSelections[theaterName] || {};
            if (!selectedTiming && selection.timing) selectedTiming = selection.timing;
            if (!selectedDate && selection.date) selectedDate = selection.date;
            if (selectedSeats.length === 0 && selection.seats) selectedSeats = [...selection.seats];
        }

        console.log('Reloaded Data in loadConfirmation:', {
            selectedMovie,
            selectedTheater,
            selectedTiming,
            selectedDate,
            selectedSeats
        });

        const confMovie = document.getElementById('confMovie');
        const confTheater = document.getElementById('confTheater');
        const confTiming = document.getElementById('confTiming');
        const confSeats = document.getElementById('confSeats');
        const confDate = document.getElementById('confDate');
        const confCost = document.getElementById('confCost');

        if (!confMovie || !confTheater || !confTiming || !confSeats || !confDate || !confCost) {
            console.error('Missing confirmation elements:', {
                confMovie, confTheater, confTiming, confSeats, confDate, confCost
            });
            return;
        }

        confMovie.textContent = `Movie: ${selectedMovie.title || 'Not selected'}`;
        confTheater.textContent = `Theater: ${selectedTheater.name || 'Not selected'}`;
        confTiming.textContent = `Timing: ${selectedTiming || 'Not selected'}`;
        confSeats.textContent = `Seats: ${selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Not selected'}`;
        confDate.textContent = `Date: ${selectedDate || 'Not selected'}`;
        confCost.textContent = `Total Cost: $${selectedSeats.reduce((total, seat) => {
            const row = seat[0];
            return total + (row === 'A' ? 250 : ['B', 'C', 'D', 'E', 'F', 'G'].includes(row) ? 200 : ['H', 'I', 'J', 'K'].includes(row) ? 175 : 0);
        }, 0)}`;
    }
}

function confirmBooking() {
    console.log('Starting confirmBooking with:', { 
        selectedMovie, 
        selectedTheater, 
        selectedTiming, 
        selectedDate, 
        selectedSeats, 
        currentUser 
    });
    if (!selectedMovie || !selectedMovie.id) {
        console.error('Cannot confirm booking: selectedMovie is null or missing id');
        alert('Booking failed: Movie data is missing. Please try again.');
        return;
    }
    if (!currentUser || !currentUser.id) {
        console.error('Cannot confirm booking: User not logged in');
        alert('Booking failed: Please log in first.');
        return;
    }
    if (!selectedTheater || !selectedTheater.id || !selectedTiming || !selectedDate || selectedSeats.length === 0) {
        console.error('Cannot confirm booking: Missing theater, timing, date, or seats');
        alert('Booking failed: Please complete all selections.');
        return;
    }

    const booking = {
        user_id: currentUser.id,
        movie_id: selectedMovie.id,
        theater_id: selectedTheater.id,
        timing: selectedTiming,
        date: selectedDate,
        seats: selectedSeats.join(', '),
        total_cost: selectedSeats.reduce((total, seat) => {
            const row = seat[0];
            return total + (row === 'A' ? 250 : ['B', 'C', 'D', 'E', 'F', 'G'].includes(row) ? 200 : ['H', 'I', 'J', 'K'].includes(row) ? 175 : 0);
        }, 0)
    };
    console.log('Sending booking data:', booking);

    fetch('http://localhost:8080/web_project/backend/api.php?action=book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
    })
    .then(response => {
        console.log('Fetch response status:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.text();
    })
    .then(text => {
        console.log('Raw response:', text);
        try {
            const data = JSON.parse(text);
            console.log('API response:', data);
            if (data.success) {
                alert('Seats are successfully booked!');
                window.location.href = 'home.html';
            } else {
                alert('Booking failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('JSON parsing error:', e);
            alert('Invalid response from server. Check console for details.');
        }
    })
    .catch(error => {
        console.error('Booking error:', error);
        alert('An error occurred while booking. Check the console for details.');
    });
}

function loadPreviousSelections() {
    if (currentUser && currentUser.id) {
        const userSelections = JSON.parse(localStorage.getItem(`selections_${currentUser.id}`)) || {};
        if (selectedTheater && userSelections[selectedTheater.name]) {
            selectedTiming = userSelections[selectedTheater.name].timing;
            selectedDate = userSelections[selectedTheater.name].date;
            selectedSeats = [...userSelections[selectedTheater.name].seats];
        }
    }
}

function goBack() {
    if (window.location.pathname.includes('movie_details.html')) window.location.href = 'home.html';
    else if (window.location.pathname.includes('theater_selection.html')) window.location.href = 'movie_details.html';
    else if (window.location.pathname.includes('ticket_selection.html')) window.location.href = 'theater_selection.html';
    else if (window.location.pathname.includes('seat_selection.html')) window.location.href = 'ticket_selection.html';
    else if (window.location.pathname.includes('confirmation.html')) window.location.href = 'seat_selection.html';
}

function reloadSelections() {
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    if (currentUser && !currentUser.id) {
        console.warn('currentUser missing id, logging out');
        currentUser = null;
        localStorage.removeItem('currentUser');
    }
    selectedMovie = JSON.parse(localStorage.getItem('selectedMovie')) || null;
    selectedTheater = JSON.parse(localStorage.getItem('selectedTheater')) || null;
    selectedTiming = JSON.parse(localStorage.getItem('selectedTiming')) || null;
    selectedSeats = JSON.parse(localStorage.getItem('selectedSeats')) || [];
    selectedDate = JSON.parse(localStorage.getItem('selectedDate')) || new Date().toISOString().split('T')[0];
    maxTickets = parseInt(localStorage.getItem('maxTickets')) || 6;
    console.log('Reloaded selections:', { currentUser, selectedMovie, selectedTheater, selectedTiming, selectedDate, selectedSeats, maxTickets });
}

window.onload = function() {
    reloadSelections();
    if (window.location.pathname.includes('home.html')) {
        if (currentUser) loadMovies();
        else window.location.href = 'login.html';
    } else if (window.location.pathname.includes('movie_details.html')) {
        if (currentUser) loadMovieDetails();
        else window.location.href = 'login.html';
    } else if (window.location.pathname.includes('theater_selection.html')) {
        if (currentUser) loadTheaters();
        else window.location.href = 'login.html';
    } else if (window.location.pathname.includes('ticket_selection.html')) {
        if (currentUser) loadTicketSelection();
        else window.location.href = 'login.html';
    } else if (window.location.pathname.includes('seat_selection.html')) {
        if (currentUser) loadSeats();
        else window.location.href = 'login.html';
    } else if (window.location.pathname.includes('confirmation.html')) {
        if (currentUser) loadConfirmation();
        else window.location.href = 'login.html';
    }
};