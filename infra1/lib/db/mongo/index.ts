import  { MongoClient } from "mongodb";

const uri = "mongodb://root:example@localhost:27017/?authSource=admin";  // Update if needed

async function connectDB() {
    try {
        const client = new MongoClient(uri, {   

        });

        await client.connect();
        console.log("Connected to MongoDB container successfully!");

        // Access the database
        const db = client.db("testdb");  // Change "testdb" to your database name
        const collection = db.collection("users");  // Example collection

        // Insert a sample document
        // await collection.insertOne({ name: "John Doe", age: 30 });

        // console.log("Inserted a sample document");

        // Fetch documents
        const users = await collection.find().toArray();
        console.log("Users:", users);

        // Close the connection
        await client.close();
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectDB();
