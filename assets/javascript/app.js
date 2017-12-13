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
sessions = database.ref('sessions'),
lookupClass = {'r': 'choice--rock', 'p': 'choice--paper', 's': 'choice--scissors'};
let rpsData = null,
playerOne = null,
playerTwo = null,
currentGame = null,
isPlayerOne = false, 
waitingForPlayerChoice = false;

let currentSession = null;

function createPlayer() {
	rpsData = localStorage.getItem('rpsData');
	if(!rpsData) {
		$('#userData').modal({show: true});
		const playerName = $('#player-name').val().trim();
		if(playerName) {
			const newPlayer = players.push({playerName: playerName, wins: 0, loses: 0});
			localStorage.setItem('rpsData', JSON.stringify({playerId: newPlayer.key}));
			initializeGame();
		}
	}
}

function initializeExistingSession(key, playerId) {
	currentSession = database.ref(`sessions/${key}`);
	const playerRef = database.ref(`players/${playerId}`);
	playerRef.once('value', function(playerSnap){
		const playerVal = playerSnap.val();
		if(playerSnap && playerSnap.val()) {
			currentSession.once('value', function(exSession) {
				const exSessionVal = exSession.val();
				if(exSessionVal.playerOne.playerId !== playerId) {
					currentSession.update({
						isVacant: false,
						playerTwo: {
							playerId: playerId,
							playerName: playerVal.playerName
						}
					});
					playerOne = exSessionVal.playerOne;
					playerTwo = { playerId: playerVal.playerId, playerName: playerVal.playerName };
					$('#playerName').text(`Hi ${playerVal.playerName}!!`);
					$('#playerOpponent').text(`Your opponent is ${exSessionVal.playerOne.playerName}!!`);
					createGame(playerId);
				}
			});
		}
	});
}


function createGame(playerId) {
	if(rpsData && rpsData.gameId) {
		currentGame = database.ref(`sessions/${currentSession.key}/games/${rpsData.gameId}`);
	} else {
		const gamesRef = database.ref(`sessions/${currentSession.key}/games`);
		currentGame = gamesRef.push({playerOne: '', playerTwo: '', winner: ''});
	}

	currentSession.update({activeGame: currentGame.key});
	currentGame.on('value', function(gameSnap){
		const gameSnapVal = gameSnap.val();
		let gameResult = null;
		if(gameSnapVal) {
			if(!gameSnapVal.playerOne) {
				if(isPlayerOne) {
					waitingForPlayerChoice = true;
					$('#takeway').text(`Waiting for You to select choice.`);
				} else {
					waitingForPlayerChoice = false;
					$('#takeway').text(`Waiting for ${playerOne.playerName} to select choice.`);
				}
			} else if (!gameSnapVal.playerTwo) {
				if(isPlayerOne) {
					waitingForPlayerChoice = false;
					$('#takeway').text(`Waiting for ${playerTwo.playerName} to select choice.`);
					updatePic('#playerChoice', gameSnapVal.playerOne);
				} else {
					waitingForPlayerChoice = true;
					$('#takeway').text(`Waiting for You to select choice.`);
					updatePic('#playerChoice', gameSnapVal.playerTwo);
				}
			} else if (gameSnapVal.playerOne === gameSnapVal.playerTwo) {
				$('#takeway').text('This Game is a Tie!!');
				updatePic('#opponentChoice', gameSnapVal.playerOne);
				updatePic('#playerChoice', gameSnapVal.playerOne);
			} else if (gameSnapVal.playerOne === 'r' && gameSnapVal.playerTwo === 's' ||
				gameSnapVal.playerOne === 'p' && gameSnapVal.playerTwo === 'r' ||
				gameSnapVal.playerOne === 's' && gameSnapVal.playerTwo === 'p')
			{
				if(isPlayerOne) {
					$('#takeway').text(`You won the game!!`);
					updatePic('#opponentChoice', gameSnapVal.playerTwo);
					updatePic('#playerChoice', gameSnapVal.playerOne);
				} else {
					$('#takeway').text(`${playerOne.playerName} won the game!!`);
					updatePic('#opponentChoice', gameSnapVal.playerOne);
					updatePic('#playerChoice', gameSnapVal.playerTwo);
				}

				updateWinsAndLoses(playerOne.playerId, true);
				updateWinsAndLoses(playerTwo.playerId, false);
			} else {
				if(isPlayerOne) {
					$('#takeway').text(`${playerTwo.playerName} won the game!!`);
					updatePic('#opponentChoice', gameSnapVal.playerTwo);
					updatePic('#playerChoice', gameSnapVal.playerOne);
				} else {
					$('#takeway').text(`You won the game!!`);
					updatePic('#opponentChoice', gameSnapVal.playerOne);
					updatePic('#playerChoice', gameSnapVal.playerTwo);
				}

				updateWinsAndLoses(playerTwo.playerId, true);
				updateWinsAndLoses(playerOne.playerId, false);
			}
		}

		localStorage.setItem('rpsData', JSON.stringify({playerId: playerId, sessionId: currentSession.key, gameId: gameSnap.key}));
	});
}

function updatePic(playerEle, action) {
	$(playerEle)
	.removeClass('choice--rock')
	.removeClass('choice--paper')
	.removeClass('choice--scissors')
	.addClass(lookupClass[action]);
}


function updateWinsAndLoses(playerId, isWIn) {
	const playerRef = database.ref(`players/${playerId}`);
	playerRef.once('value', function(playerSnap){
		const playerSnapVal = playerSnap.val();
		if(playerSnapVal) {
			if(isWIn) {
				const wins = playerSnapVal.wins || 0;
				playerRef.update({wins: wins + 1});
			} else {
				const loses = playerSnapVal.loses || 0;
				playerRef.update({loses: loses + 1});
			}
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
			isPlayerOne = true;
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
					$('#playerName').text(`Hi ${playerOne.playerName}!!`);
					$('#takeway').text('Waiting for other player to Join');
					localStorage.setItem('rpsData', JSON.stringify({playerId: playerId, sessionId: newSession.key}));
				}
			});
		}
	});
}

function initializeGame() {
	rpsData = localStorage.getItem('rpsData');

	if(rpsData) {
		rpsData = JSON.parse(rpsData);
		$('#userData').modal({show: false});
		const playerId = rpsData.playerId,
		sessionId = rpsData.sessionId;

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

$('.js-action').on('click', function(event){
	event.preventDefault();
	if(waitingForPlayerChoice) {
		if(isPlayerOne) {
			currentGame.update({playerOne: $(event.currentTarget).attr('data-action')});
		} else {
			currentGame.update({playerTwo: $(event.currentTarget).attr('data-action')});
		}
	}
});

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

initializeGame();
