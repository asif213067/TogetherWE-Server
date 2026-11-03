export const EVENT_TYPES = [
  "Donation",
  "Cleanup",
  "Plantation",
  "Winter Relief",
  "Food Drive",
  "Health Camp",
  "Education",
];

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const text = (value) => (typeof value === "string" ? value.trim() : "");

// Normalizes text for duplicate-event comparison: case-insensitive,
// trimmed, with repeated whitespace collapsed to single spaces.
export const normalizeEventText = (value) =>
  text(value).replace(/\s+/g, " ").toLowerCase();

export function validateEventInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const title = text(input.title);
  const description = text(input.description);
  const eventType = text(input.eventType);
  const thumbnail = text(input.thumbnail);
  const location = text(input.location);
  const eventDate = new Date(input.eventDate);

  const errors = {};

  if (title.length < 5 || title.length > 80) {
    errors.title = "Title must be between 5 and 80 characters.";
  }

  if (description.length < 20 || description.length > 1000) {
    errors.description = "Description must be between 20 and 1000 characters.";
  }

  if (!EVENT_TYPES.includes(eventType)) {
    errors.eventType = "Choose a valid event type.";
  }

  if (!isHttpsUrl(thumbnail)) {
    errors.thumbnail = "Please provide a valid HTTPS thumbnail URL.";
  }

  if (location.length < 3 || location.length > 100) {
    errors.location = "Location must be between 3 and 100 characters.";
  }

  if (Number.isNaN(eventDate.getTime())) {
    errors.eventDate = "Invalid event date.";
  } else if (eventDate.getTime() <= Date.now()) {
    errors.eventDate = "Event date must be in the future.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    values: { title, description, eventType, thumbnail, location, eventDate },
  };
}
