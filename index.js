import express from "express";
import { createHash } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

import { verifyToken } from "./middleware/verify-token.js";
import { validateEventInput, normalizeEventText } from "./utils/validate-event.js";

const app = express();

const clientUrl = (process.env.CLIENT_URL ?? "").replace(/\/+$/, "");
app.use(cors({ origin: [clientUrl, "http://localhost:3000"] }));

app.use(express.json());

const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_CLIENT);

try {
  await client.connect();
  console.log("You successfully connected to MongoDB!");
} catch (error) {
  console.error("MongoDB connection failed:", error);
  process.exit(1);
}

const db = client.db("togetherWe");
const eventsCollection = db.collection("events");
const galleryCollection = db.collection("gallery");

await eventsCollection.createIndex({ eventDate: 1 });
await eventsCollection.createIndex({ createdAt: -1 });

// Concurrency-safe duplicate-event prevention. dupKey is a deterministic
// SHA-256 hash of the organizer id, normalized title, exact event timestamp,
// and normalized location. Only new events carry dupKey, so the partial
// unique index never conflicts with legacy documents. If index creation
// fails, the server refuses to start instead of running unprotected.
try {
  await eventsCollection.createIndex(
    { dupKey: 1 },
    {
      name: "dupKey_unique",
      unique: true,
      partialFilterExpression: { dupKey: { $type: "string" } },
    },
  );
} catch (error) {
  console.error(
    "Failed to create the dupKey unique index. Duplicate-event protection is unavailable, refusing to start:",
    error,
  );
  process.exit(1);
}

const participantCount = { $size: { $ifNull: ["$participants", []] } };

const listProjection = {
  slug: 1,
  title: 1,
  description: 1,
  eventType: 1,
  thumbnail: 1,
  location: 1,
  eventDate: 1,
  participantCount,
};

const detailProjection = {
  ...listProjection,
  organizerName: { $ifNull: ["$organizerName", "Community organizer"] },
  organizerPhoto: 1,
  hasEnded: { $lt: ["$eventDate", "$$NOW"] },
};

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

const ownerFilter = (user) => ({ organizerId: user.id });

const startOfToday = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

async function createUniqueSlug(title) {
  const baseSlug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "event";

  let slug = baseSlug;
  let counter = 1;

  while (await eventsCollection.findOne({ slug }, { projection: { _id: 1 } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

const duplicateEventResponse = (res) =>
  res.status(409).json({
    success: false,
    code: "DUPLICATE_EVENT",
    message:
      "You have already created an event with the same title, date, and location.",
  });

app.get("/", (req, res) => {
  res.send("Hello Asif Khan!");
});

app.get("/all-events", async (req, res) => {
  try {
    const events = await eventsCollection
      .find(
        { eventDate: { $gte: startOfToday() } },
        { projection: listProjection },
      )
      .sort({ eventDate: 1, _id: 1 })
      .toArray();

    res.json(events);
  } catch (error) {
    console.error("Failed to load events:", error);
    res.status(500).json({ message: "Failed to load events" });
  }
});

app.get("/recent-events", async (req, res) => {
  try {
    const events = await eventsCollection
      .find(
        { eventDate: { $gte: startOfToday() } },
        { projection: listProjection },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();

    res.json(events);
  } catch (error) {
    console.error("Failed to load recent events:", error);
    res.status(500).json({ message: "Failed to load recent events" });
  }
});

app.get("/my-events", verifyToken, async (req, res) => {
  try {
    const events = await eventsCollection
      .find(ownerFilter(req.user), {
        projection: {
          ...listProjection,
          hasEnded: { $lt: ["$eventDate", "$$NOW"] },
        },
      })
      .sort({ eventDate: 1, _id: 1 })
      .toArray();

    res.json(events);
  } catch (error) {
    console.error("Failed to load my events:", error);
    res.status(500).json({ message: "Failed to load your events" });
  }
});

app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
      ...ownerFilter(req.user),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ success: false, message: "Failed to delete event" });
  }
});

app.patch("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const { values, errors } = validateEventInput(req.body);

    if (errors) {
      return res.status(400).json({
        success: false,
        message: Object.values(errors)[0],
        errors,
      });
    }

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id), ...ownerFilter(req.user) },
      { $set: { ...values, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, message: "Event updated successfully" });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ success: false, message: "Failed to update event" });
  }
});



app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = await eventsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: detailProjection },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
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
    console.error("Failed to load gallery:", error);
    res.status(500).json({ message: "Failed to load gallery" });
  }
});

app.post("/create-event", verifyToken, async (req, res) => {
  try {
    const { values, errors } = validateEventInput(req.body);

    if (errors) {
      return res.status(400).json({
        success: false,
        message: Object.values(errors)[0],
        errors,
      });
    }

    const organizerId = req.user.id;
    const organizerEmail = req.user.email;
    const normalizedTitle = normalizeEventText(values.title);
    const normalizedLocation = normalizeEventText(values.location);

    // Friendly pre-check (non-authoritative). Organizer identity comes from
    // the verified JWT, never from the request body. The organizerEmail
    // fallback only matches this organizer's legacy documents that were
    // stored without organizerId.
    const duplicateCandidates = await eventsCollection
      .find({
        eventDate: values.eventDate,
        $or: [
          { organizerId },
          { organizerId: { $exists: false }, organizerEmail },
        ],
      })
      .toArray();

    const isDuplicateEvent = duplicateCandidates.some(
      (candidate) =>
        normalizeEventText(candidate.title) === normalizedTitle &&
        normalizeEventText(candidate.location) === normalizedLocation,
    );

    if (isDuplicateEvent) {
      return duplicateEventResponse(res);
    }

    // Deterministic duplicate key: SHA-256 over a canonical representation of
    // organizer id + normalized title + exact event timestamp + normalized
    // location. JSON.stringify makes the representation unambiguous.
    const dupKey = createHash("sha256")
      .update(
        JSON.stringify([
          `u:${organizerId}`,
          normalizedTitle,
          values.eventDate.toISOString(),
          normalizedLocation,
        ]),
      )
      .digest("hex");

    const now = new Date();

    const newEvent = {
      slug: await createUniqueSlug(values.title),
      ...values,
      organizerId,
      organizerEmail,
      organizerName: req.user.name,
      organizerPhoto: req.user.image,
      participants: [],
      createdAt: now,
      updatedAt: now,
      dupKey,
    };

    const result = await eventsCollection.insertOne(newEvent);

    res.status(201).json({
      success: true,
      message: "Event created successfully!",
      eventId: result.insertedId.toString(),
    });
  } catch (error) {
    // Two concurrent identical inserts race on the dupKey unique index;
    // the loser gets E11000 and must receive the same 409 response.
    if (error.code === 11000) {
      return duplicateEventResponse(res);
    }

    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
