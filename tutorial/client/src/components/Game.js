import { useState } from 'react';
import Board from './Board';
import './Chat.css';
import {
  Window,
  MesageLis,
  MessageInput,
  MessageList,
} from 'stream-chat-react';

function Game({ channel, setChannel }) {
  const [playersJoined, setPlayersJoined] = useState(
    channel.state.watcher_count === 2
  );

  const [result, setResult] = useState({ winner: 'none', state: 'none' });

  channel.on('user.watching.start', (event) => {
    setPlayersJoined(event.watcher_count === 2);
  });
  if (!playersJoined) {
    return <div>Waiting for Other Player to Join...</div>;
  }

  return (
    <div className="gameContainer">
      <Board result={result} setResult={setResult} />
      <div>
        <h1>Chat</h1>
        <Window>
          <MessageList
            disableDateSeparator
            closeReactionSelectorOnClick
            messageActions={['react']}
          />
          <MessageInput noFiles />
        </Window>
      </div>
      <button
        onClick={async () => {
          await channel.stopWatching();
          setChannel(null);
        }}
      >
        Leave Game
      </button>
      {result.state === 'won' && <div>{result.winner} Won The Game!</div>}
      {result.state === 'tie' && <div>Game Ended In a Tie</div>}
    </div>
  );
}
export default Game;
