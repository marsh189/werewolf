import express from 'express';
import cors from 'cors';
const app = express();

app.use(cors());
app.use(express.json());
const api_key = import.meta.env.STREAM_KEY;
const api_secret = import.meta.env.STREAM_SECRET;
app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
