import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_CLIENT);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("togetherWe");
const eventsCollection = db.collection("events");
const galleryCollection = db.collection("gallery");

const listProjection = {
  slug: 1,
  title: 1,
  description: 1,
  eventType: 1,
  thumbnail: 1,
  location: 1,
  eventDate: 1,
  participantCount: { $size: { $ifNull: ["$participants", []] } },
};

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

app.get("/", (req, res) => {
  res.send("Hello World Asif Khan!");
});


app.get("/all-events", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const events = await eventsCollection
      .find({ eventDate: { $gte: startOfToday } })
      .sort({ eventDate: 1, _id: 1 })
      .toArray();

    res.json(events);
  } catch (error) {
    console.error("Failed to load events:", error);
    res.status(500).json({ message: "Failed to load events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      ...event,
      participantCount: event.participants?.length ?? 0,
      hasEnded: new Date(event.eventDate) < new Date(),
    });
  } catch (error) {
    console.error("Single event error:", error);
    res.status(500).json({ message: "Failed to load event" });
  }
});

app.get("/gallery", async (req, res) => {
  try {
    const items = await galleryCollection
      .find({}, { projection: { title: 1, location: 1, image: 1 } })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load gallery" });
  }
});


// ============ Get Recent upcoming events ===============
app.get("/recent-events", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const events = await eventsCollection
      .find(
        { eventDate: { $gte: startOfToday } },
        { projection: listProjection },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load recent events" });
  }
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});