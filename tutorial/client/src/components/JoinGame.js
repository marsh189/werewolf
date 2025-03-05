import { useState } from 'react';
import { useChatContext, Channel } from 'stream-chat-react';
import Game from './Game';
import CustomInput from './CustomInput';

function JoinGame() {
  const [rivalUsername, setRivalUsername] = useState('');
  const [channel, setChannel] = useState(null);

  const { client } = useChatContext();
  const createChannel = async () => {
    const response = await client.queryUsers({ name: { $eq: rivalUsername } });

    if (response.users.length === 0) {
      alert('User Not Found');
      return;
    }

    const newChannel = await client.channel('messaging', {
      members: [client.userID, response.users[0].id],
    });

    await newChannel.watch();
    setChannel(newChannel);
  };
  return (
    <>
      {channel ? (
        <Channel channel={channel} Input={CustomInput}>
          <Game channel={channel} setChannel={setChannel} />
        </Channel>
      ) : (
        <div className="joinGame">
          {' '}
          <h4>Create Game</h4>
          <input
            placeholder="Username of rival..."
            onChange={(event) => {
              setRivalUsername(event.target.value);
            }}
          />
          <button onClick={createChannel}>Start Game</button>
        </div>
      )}
    </>
  );
}
export default JoinGame;
