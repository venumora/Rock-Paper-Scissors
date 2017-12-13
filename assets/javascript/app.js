'use strict';

const config = {
	apiKey: "AIzaSyCfivrT8Szj8aWN0cQFYNwJFDfWOKm03VM",
	authDomain: "vm-rock-paper-scissors.firebaseapp.com",
	databaseURL: "https://vm-rock-paper-scissors.firebaseio.com",
	projectId: "vm-rock-paper-scissors",
	storageBucket: "vm-rock-paper-scissors.appspot.com",
	messagingSenderId: "248657926915"
};

firebase.initializeApp(config);

// Variables
// ================================================================================

// Get a reference to the database service
const database = firebase.database(),
players = database.ref('players'), 
sessions = database.ref('sessions');

let currentSession = null;

function createPlayer() {
	const rpsData = localStorage.getItem('rpsData');
	if(!rpsData) {
		$('#userData').modal({show: true});
		const playerName = $('#player-name').val().trim();
		if(playerName) {
			const newPlayer = players.push({playerName: playerName});
			localStorage.setItem('rpsData', JSON.stringify({playerId: newPlayer.key}));
			initializeGame();
		}
	}
}

function initializeExistingSession(key, playerId) {
	currentSession = database.ref(`sessions/${key}`),
	playerRef = database.ref(`players/${playerId}`);
	playerRef.once('value', function(playerSnap){
		const playerVal = playerSnap.val();
		if(playerSnap && playerSnap.val()) {
			existingSessionRef.once('value', function(exSession) {
				const exSessionVal = exSession.val();
				if(exSessionVal.playerOne.playerId !== playerId) {
					existingSessionRef.update({
						isVacant: false,
						playerTwo: {
							playerId: playerId,
							playerName: playerVal.playerName
						}
					});
					localStorage.setItem('rpsData', JSON.stringify({playerId: playerId, sessionId: exSession.key}));
				}
			});
		}
	});
}

function createSession(playerId) {
	sessions.once('value', function(sessionSnap){
		let existingSession = null;

		sessionSnap.forEach(function(session){
			if(session.val() && session.val().isVacant){
				existingSession = session;
				return;
			}
		});

		if(existingSession) {
			initializeExistingSession(existingSession.key, playerId);
		} else {
			database.ref(`players/${playerId}`).once('value', function(playerOneSnap){
				var playerOne = playerOneSnap.val();
				if(playerOne) {
					const session = {
						isVacant: true,
						playerOne: {
							playerId: playerId,
							playerName: playerOne.playerName
						}
					},
					newSession = sessions.push(session);
					localStorage.setItem('rpsData', JSON.stringify({playerId: playerId, sessionId: newSession.key}));
				}
			});
		}
	});
}

function initializeGame() {
	const rpsData = localStorage.getItem('rpsData');

	if(rpsData) {
		$('#userData').modal({show: false});
		const playerId = JSON.parse(rpsData).playerId,
		sessionId = JSON.parse(rpsData).sessionId;

		if(sessionId) {
			initializeExistingSession(sessionId, playerId);
		} else {
			createSession(playerId);
		}
	} else {
		createPlayer();
	}
}

function endGame() {
	
}

$('.js-start-game').on('click', function(event) {
	const playerName = $('#player-name').val().trim();
	if(!playerName) {
		return false;
	}

	event.preventDefault();
	initializeGame();
});

$('#endGame').on('click', function(event) {
	event.preventDefault();
	endGame();
});

$('#resetPlayer').on('click', function(event) {
	event.preventDefault();
	localStorage.removeItem('rpsData');
	initializeGame();
});

// initializeGame();
