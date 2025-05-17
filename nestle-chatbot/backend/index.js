import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: `Backend is up and running!` });
});

app.post('/chat', (req, res) => {
    res.json({alive: `Chatbot shows up here`})
})

app.listen(PORT, () => {
    console.log(`Currently running on ${PORT}`)
})