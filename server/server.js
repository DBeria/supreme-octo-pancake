import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import courseRoutes from './routes/courseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import path from 'path';

dotenv.config();

connectDB();

const app = express();

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:5173', 
        'https://pocus-world-backend.onrender.com',
        'https://pocusworld.netlify.app/' 
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

// Serve frontend build in production
const __dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '/client/dist')));
    
    app.get('*', (req, res) => 
        res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

// Custom error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));