import express from 'express';
import cors from 'cors';
import { StreamChat } from 'stream-chat';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json());

const api_key = process.env.STREAM_KEY;
const api_secret = process.env.STREAM_SECRET;
const serverClient = StreamChat.getInstance(api_key, api_secret);

app.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, password } = req.body;

    const { users } = await serverClient.queryUsers({ name: username });
    if (users.length > 0) {
      return res.json({ message: 'User Already Exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const token = serverClient.createToken(userId);
    const response = {
      token,
      userId,
      firstName,
      lastName,
      username,
      hashedPassword,
    };
    res.json(response);
  } catch (error) {
    res.json(error);
  }
});
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { users } = await serverClient.queryUsers({ name: username });
    if (users.length === 0) {
      return res.json({ message: 'User Not Found' });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      users[0].hashedPassword
    );

    const token = serverClient.createToken(users[0].id);
    if (passwordMatch) {
      res.json({
        token,
        firstName: users[0].firstName,
        lastName: users[0].lastName,
        username,
        userId: users[0].id,
      });
    }
  } catch (error) {
    res.json(error);
  }
});

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
