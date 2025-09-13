const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route files
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/authors');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://pocus-world-backend.onrender.com',
        'https://pocus-world.netlify.app'
    ],
    credentials: true,
};
app.use(cors(corsOptions));

// Mount routers
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);


if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html')));
} else {
    app.get('/', (req, res) => {
        res.send('API is running....');
    });
}

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));