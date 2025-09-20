import express from "express";
import { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
    console.log("Health check requested2222");
    res.status(200).json({
        message: "Hello World! Express server is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Simple API endpoint
app.get("/api/status", (req: Request, res: Response) => {
    res.status(200).json({
        status: "success",
        message: "API is working properly",
        version: "1.0.0"
    });
});

// POST endpoint for testing JSON data
app.post("/api/echo", (req: Request, res: Response) => {
    console.log("Echo request received:", req.body);
    res.status(200).json({
        message: "Echo successful",
        received: req.body,
        timestamp: new Date().toISOString()
    });
});

// GET endpoint with query parameters
app.get("/api/greet", (req: Request, res: Response) => {
    const name = req.query.name || "World";
    res.status(200).json({
        message: `Hello, ${name}!`,
        query: req.query
    });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("Error occurred:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Express server is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
    console.log(`🔧 API Status: http://localhost:${PORT}/api/status`);
});