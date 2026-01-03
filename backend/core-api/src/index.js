import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
const apiRouter = express.Router();

// Define routes on the Router, not 'app'
apiRouter.get('/', (req, res) => {
  res.send('Core API is Alive!');
});

// Mount the Router at '/api'
app.use('/api', apiRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`Core API running on port ${PORT}`);
});