'use strict';

(function() {
	const config = {
		apiKey: "AIzaSyCfivrT8Szj8aWN0cQFYNwJFDfWOKm03VM",
		authDomain: "vm-rock-paper-scissors.firebaseapp.com",
		databaseURL: "https://vm-rock-paper-scissors.firebaseio.com",
		projectId: "vm-rock-paper-scissors",
		storageBucket: "vm-rock-paper-scissors.appspot.com",
		messagingSenderId: "248657926915"
	};

	firebase.initializeApp(config);
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
			$('#userData').modal('show');
			const playerName = $('#player-name').val().trim();
			if(playerName) {
				const newPlayer = players.push({playerName: playerName, wins: 0, loses: 0});
				localStorage.setItem('rpsData', JSON.stringify({playerId: newPlayer.key}));
				$('#player-name').val('');
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
						isPlayerOne = false;
						currentSession.update({
							isVacant: false,
							playerTwo: {
								playerId: playerId,
								playerName: playerVal.playerName
							}
						});
						playerOne = exSessionVal.playerOne;
						playerTwo = { playerId: playerSnap.key, playerName: playerVal.playerName };
						$('#playerName').text(`Hi ${playerVal.playerName}!!`);
						$('#playerOpponent').text(`Your opponent is ${exSessionVal.playerOne.playerName}!!`);
					} else if (exSessionVal.playerTwo) {
						isPlayerOne = true;
						playerOne = exSessionVal.playerOne;
						playerTwo = exSessionVal.playerTwo;
						$('#playerName').text(`Hi ${playerOne.playerName}!!`);
						$('#playerOpponent').text(`Your opponent is ${playerTwo.playerName}!!`);
					}

					createGame(playerId, exSessionVal.activeGame);
				});
			}
		});
	}

	function updateGameStaus(status, winner) {
		if(currentGame) {
			const props = {};
			if(status) {
				props.status = status;
			}

			if(winner) {
				props.winner = winner;
			}

			currentGame.update(props);
		}
	}


	function createGame(playerId, gameId) {
		const gamesRef = database.ref(`sessions/${currentSession.key}/games`);

		if(gameId) {
			currentGame = database.ref(`sessions/${currentSession.key}/games/${gameId}`);
			updateGameStaus('started');
		} else {
			currentGame = gamesRef.push({playerOne: '', playerTwo: '', winner: ''});
			updateGameStaus('waiting');
		}

		currentSession.update({activeGame: currentGame.key});

		gamesRef.on('child_added', function(addedGame) {
			currentSession.once('value', function(exSession) {
				const exSessionVal = exSession.val();
				if (exSessionVal && exSessionVal.activeGame === addedGame.key) {
					updatePic('#opponentChoice');
					updatePic('#playerChoice');
					currentGame = database.ref(`sessions/${currentSession.key}/games/${addedGame.key}`);
					watchGame(playerId);
					watchPlayers();
					watchChat();
				}
			});
		});
	}

	function updatePlayerScore(player, playerEle, playerMessage) {
		if(player) {
			const playerRef = database.ref(`players/${player.playerId}`);
			playerRef.off();
			playerRef.on('value', function(playerSnap) {
				const playerSnapVal = playerSnap.val();
				$(playerEle).text(`${playerMessage} WINS - ${parseInt(playerOne.wins || 0)} 
					LOSES - ${parseInt(playerOne.loses || 0)}`);
			});
		}
	}

	function watchPlayers() {
		if(isPlayerOne) {
			updatePlayerScore(playerOne, '#playerChoiceHistory', 'Your score card:');
			updatePlayerScore(playerTwo, '#opponentChoiceHistory', 'Your opponents score card:');
		} else {
			updatePlayerScore(playerTwo, '#playerChoiceHistory', 'Your score card:');
			updatePlayerScore(playerOne, '#opponentChoiceHistory', 'Your opponents score card:');
		}
	}

	function watchGame(playerId) {
		if (currentGame) {
			currentGame.off();
			currentGame.on('value', function(gameSnap) {
				const gameSnapVal = gameSnap.val();
				let gameResult = null;

				if(gameSnapVal && gameSnapVal.status === 'terminated') {
					localStorage.setItem('rpsData', JSON.stringify({playerId: isPlayerOne ? playerOne.playerId : playerTwo.playerId}));
					waitingForPlayerChoice = false;
					setTimeout(initializeGame, 5000);
					return;
				}

				if(gameSnapVal && gameSnapVal.status !== 'ended') {
					$('#playerChoice').removeClass('loader').removeClass('loader--spin');
					$('#opponentChoice').removeClass('loader').removeClass('loader--spin');
					if(!gameSnapVal.playerOne) {
						if(isPlayerOne) {
							currentSession.once('value', function(exSession) {
								const exSessionVal = exSession.val();
								if (exSessionVal) {
									playerOne = exSessionVal.playerOne;
									playerTwo = exSessionVal.playerTwo;
									waitingForPlayerChoice = playerTwo ? true : false;
									$('#takeway').text(`Waiting for You to select choice.`);
									$('#playerChoice').addClass('loader').addClass('loader--spin');
								}
							});
						} else {
							waitingForPlayerChoice = false;
							$('#takeway').text(`Waiting for ${playerOne.playerName} to select choice.`);
							$('#opponentChoice').addClass('loader').addClass('loader--spin');
						}
					} else if (!gameSnapVal.playerTwo) {
						if(isPlayerOne) {
							waitingForPlayerChoice = false;
							$('#takeway').text(`Waiting for ${playerTwo.playerName} to select choice.`);
							updatePic('#playerChoice', gameSnapVal.playerOne);
							$('#opponentChoice').addClass('loader').addClass('loader--spin');
						} else {
							waitingForPlayerChoice = true;
							$('#takeway').text(`Waiting for You to select choice.`);
							updatePic('#playerChoice', gameSnapVal.playerTwo);
							$('#playerChoice').addClass('loader').addClass('loader--spin');
						}
					} else if (gameSnapVal.playerOne === gameSnapVal.playerTwo) {
						$('#takeway').text('This Game is a Tie!!');
						updatePic('#opponentChoice', gameSnapVal.playerOne);
						updatePic('#playerChoice', gameSnapVal.playerOne);
						updateWinsAndLoses();
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
	}

	function updatePic(playerEle, action) {
		$(playerEle)
		.removeClass('choice--rock')
		.removeClass('choice--paper')
		.removeClass('choice--scissors');
		if(action) {
			$(playerEle).addClass(lookupClass[action]);
		}
	}


	function updateWinsAndLoses(playerId, isWIn) {
		$('#startNew').show();

		if(playerId) {
			const playerRef = database.ref(`players/${playerId}`);
			playerRef.once('value', function(playerSnap){
				const playerSnapVal = playerSnap.val();
				if(playerSnapVal) {
					if(isWIn) {
						const wins = playerSnapVal.wins || 0;
						playerRef.update({wins: wins + 1});
						updateGameStaus('ended', playerId);
					} else {
						const loses = playerSnapVal.loses || 0;
						playerRef.update({loses: loses + 1});
					}
				}
			});
		} else {
			updateGameStaus('ended', 'tie');
		}
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
					waitingForPlayerChoice = false;
					if(playerOne) {
						const session = {
							isVacant: true,
							playerOne: {
								playerId: playerId,
								playerName: playerOne.playerName
							}
						};
						currentSession = sessions.push(session);
						createGame(playerId);
						$('#playerName').text(`Hi ${playerOne.playerName}!!`);
						$('#takeway').text('Waiting for other player to Join');
					}
				});
			}
		});
	}

	function sendMessage(message) {
		if (currentSession && playerOne && playerTwo) {
			const chatRef = database.ref(`sessions/${currentSession.key}/chat`);
			const chat = {};
			chat.message = message;
			chat.playerId = isPlayerOne ? playerOne.playerId : playerTwo.playerId;
			chatRef.push(chat);
		}
	}

	function watchChat() {
		if (currentSession) {
			const chatRef = database.ref(`sessions/${currentSession.key}/chat`);
			chatRef.off();
			chatRef.on('child_added', function(chatSnap) {
				let messageItem = $('<li class="list-group-item">');
				let messageCont = $('<div class="msg">');
				const chatSnapVal = chatSnap.val();
				messageCont.text(chatSnapVal.message);
				if(isPlayerOne) {
					if(chatSnapVal.playerId === playerOne.playerId) {
						messageCont.addClass('msg--right');
					} else {
						messageCont.addClass('msg--left');
					}
				} else {
					if(chatSnapVal.playerId === playerTwo.playerId) {
						messageCont.addClass('msg--right');
					} else {
						messageCont.addClass('msg--left');
					}
				}
				messageItem.append(messageCont);
				$('#messages').append(messageItem);
				$('.jumbotron').scrollTop(500);
			});
		}
	}

	function initializeGame() {
		rpsData = localStorage.getItem('rpsData');
		$('#takeway').text('Waiting for You to Join');
		$('#startNew').hide();
		if(rpsData) {
			rpsData = JSON.parse(rpsData);
			$('#userData').modal('hide');
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


	$(document).on('click', '#startNew', function(event) {
		event.preventDefault();
		$(this).hide();
		currentGame.off('value');
		if(isPlayerOne) {
			createGame(playerOne.playerId);
		} else {
			createGame(playerTwo.playerId);
		}
	});


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

	$('#playerDetails').on('submit', function(event) {
		const playerName = $('#player-name').val().trim();
		if(!playerName) {
			return false;
		}

		event.preventDefault();
		initializeGame();
	});

	$('#resetPlayer').on('click', function(event) {
		event.preventDefault();
		localStorage.removeItem('rpsData');
		initializeGame();
	});

	$('#chatForm').on('submit', function(event){
		const message = $('#message').val().trim();

		if(!message) {
			return false;
		}
		event.preventDefault();
		sendMessage(message);
		$('#message').val('');
	});

	$(window).bind("beforeunload", function() {
		updateGameStaus('terminated');
		const session = database.ref(`sessions/${currentSession.key}`);
		session.update({isVacant: false});
		const player = isPlayerOne ? playerOne : playerTwo;
		if(player) {
			localStorage.setItem('rpsData', JSON.stringify({playerId: player.playerId}));
			sendMessage(`${player.playerName} left the game!!`);
		}
	});

	initializeGame();


})();
