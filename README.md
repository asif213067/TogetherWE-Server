# TogetherWe --- Backend API

The **TogetherWe Backend** powers the Social Development & Community
Events Platform. It provides event data, event participation, and
authenticated event-management operations for the TogetherWe frontend.

## Project Links

- **Frontend:** [TogetherWe](https://togetherwe-client-by-asif.vercel.app/)
- **Backend API:** [TogetherWe Server](https://togetherwe-server.onrender.com)
- **Frontend Repository:** [TogetherWe Client](https://github.com/asif213067/TogetherWe-Client)
- **Server Repository:** [TogetherWe Server](https://github.com/asif213067/TogetherWE-Server)

------------------------------------------------------------------------

## Overview

TogetherWe helps people discover, create, join, and manage
community-service events such as winter clothing distribution, blanket
distribution, community cleanup, tree plantation, and donation
campaigns.

This repository contains the backend API built with **Node.js,
Express.js, and MongoDB Atlas**. It is deployed separately from the
Next.js frontend.

## Features

-   Express.js REST API for event-related operations.
-   MongoDB Atlas integration for persistent event data.
-   Public API access for browsing upcoming events and viewing event
    details.
-   Authenticated event creation and event participation.
-   Joined-event retrieval for the current user.
-   Manage-events operations for events created by the current user.
-   Update and delete operations with event-ownership checks.
-   JWT verification for protected API endpoints.
-   Request validation and meaningful HTTP responses.
-   CORS configuration for the TogetherWe frontend.
-   Event date filtering so expired events do not appear in
    upcoming-event results.

------------------------------------------------------------------------

## Technology Stack

-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Database:** MongoDB Atlas
-   **Authentication:** Better Auth
-   **Authorization:** JWT validation
-   **JWT/JWKS verification:** `jose` (if used in the current
    implementation)
-   **Deployment:** Render

------------------------------------------------------------------------

## Project Structure

``` text
├── togetherwe-server/           # Express.js backend
│   ├── index.js                 # Main Express server and API routes
│   ├── middleware/
│   │   └── verify-token.js      # JWT authentication and token verification
│   └── utils/
│       └── validate-event.js    # Event data validation utilities
```

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js (LTS recommended)
-   npm
-   MongoDB Atlas account
-   Better Auth configuration
-   Render account for deployment

### 1. Clone the repository

``` bash
git clone https://github.com/asif213067/TogetherWE-Server
cd togetherwe-server
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend root directory.

Example:

``` env
PORT=5000
MONGO_DB_URL=your_mongodb_atlas_connection_string

# Better Auth / JWT settings (use the exact variable names read by your code)
BETTER_AUTH_URL=http://localhost:3000
```

**Important:** Environment variable names must match your actual backend
code. Do not commit `.env` or share database credentials, authentication
secrets, or OAuth secrets publicly.

### 4. Start the backend

Use the script defined in `package.json`:

``` bash
npm run dev
```

If no `dev` script exists, use the configured start script, for example:

``` bash
npm start
```

The backend will usually run at:

``` text
http://localhost:5000
```

------------------------------------------------------------------------

## Environment Variables

  -----------------------------------------------------------------------
  Variable                Purpose                 Example
  ----------------------- ----------------------- -----------------------
  `PORT`                  Port used by the        `5000`
                          Express server          

  `MONGO_DB_URL`          MongoDB Atlas           Keep private
                          connection string       

  `BETTER_AUTH_URL`       Auth base URL, if read  Local frontend URL
                          by the server           
  -----------------------------------------------------------------------

Your actual project may use additional environment variables for Better
Auth, OAuth providers, JWT verification, or CORS. Add them here using
their exact names, but **never include real secret values**.

------------------------------------------------------------------------

## API Endpoints

The following table describes the expected API functionality. Replace or
adjust the route paths to match the routes implemented in `index.js`.

  --------------------------------------------------------------------------
  Method            Endpoint             Purpose           Access
  ----------------- -------------------- ----------------- -----------------
  `GET`             `/`                  Backend status /  Public
                                         welcome response  

  `GET`             `/all-events`        Get upcoming      Public
                                         events            

  `GET`             `/events/:id`        Get event details Public

  `POST`            `/events`            Create an event   Authenticated

  `POST`            `/events/:id/join`   Join an event     Authenticated

  `GET`             `/joined-events`     Get events joined Authenticated
                                         by the current    
                                         user              

  `GET`             `/my-events`         Get events        Authenticated
                                         created by the    
                                         current user      

  `PATCH` or `PUT`  `/events/:id`        Update an owned   Authenticated +
                                         event             owner

  `DELETE`          `/events/:id`        Delete an owned   Authenticated +
                                         event             owner
  --------------------------------------------------------------------------

**Important:** These are documentation examples, not a guarantee that
every route path matches your server. Check `index.js` and update the
table to reflect the exact route names and HTTP methods. Do not document
endpoints that are not implemented.

------------------------------------------------------------------------

## Event Data

An event may contain fields such as:

``` json
{
  "slug": "community-cleanup",
  "title": "Community Cleanup",
  "description": "Join local volunteers to make our community cleaner.",
  "eventType": "Cleanup",
  "thumbnail": "https://example.com/event-image.jpg",
  "location": "Pabna, Bangladesh",
  "eventDate": "2026-12-15T09:00:00.000Z",
  "organizerName": "Community Organizer",
  "organizerId": "authenticated-user-id",
  "participants": [],
  "createdAt": "2026-11-03T03:00:00.000Z"
}
```

This is an illustrative example. The actual fields and data types should
match your MongoDB schema.

### Event date handling

-   Store event dates consistently as MongoDB `Date` values where date
    comparisons are required.
-   Validate dates on the backend, not only in the frontend.
-   Reject past dates when creating or updating events, if required by
    the application.
-   Exclude past events from the upcoming-events endpoint.
-   Use a consistent timezone policy when comparing event dates.

------------------------------------------------------------------------

## Authentication and Security

Protected routes must verify the authenticated user's identity using the
authentication system configured in the project.

### Security practices

-   Verify JWTs or Better Auth sessions on protected endpoints.
-   Never trust a user ID or email supplied only in the request body.
-   Derive the current user from the verified authentication
    token/session.
-   Validate event ownership before updating or deleting an event.
-   Validate and sanitize incoming request data.
-   Prevent duplicate event participation where appropriate.
-   Use appropriate HTTP status codes for errors.
-   Configure CORS to allow only trusted frontend origins in production.
-   Keep database credentials and authentication secrets in environment
    variables.
-   Do not expose private organizer or user data unnecessarily.

------------------------------------------------------------------------

## Frontend Integration

The TogetherWe frontend is deployed on Vercel:

**Frontend URL:** https://togetherwe-client-by-asif.vercel.app

Configure the frontend API base URL to point to this backend service.

For local development, the frontend may use:

``` env
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:5000
```

For production, set it to your deployed Render backend URL.

Make sure the backend CORS configuration permits the frontend origin.

------------------------------------------------------------------------

## Deployment on Render

1.  Push the backend code to GitHub.

2.  Create a new Web Service in Render.

3.  Connect the backend repository.

4.  Configure the build command, usually:

    ``` bash
    npm install
    ```

5.  Configure the start command based on your `package.json`, for
    example:

    ``` bash
    npm start
    ```

6.  Add the required environment variables in Render.

7.  Confirm MongoDB Atlas allows the backend service to connect.

8.  Deploy the service.

9.  Test the root endpoint and event API endpoints.

10. Update the frontend's production API URL with the Render service
    URL.

**Backend URL:** https://togetherwe-server.onrender.com

------------------------------------------------------------------------

## Error Handling

The API should return clear responses for common cases:

-   Invalid request data
-   Missing or invalid authentication
-   Event not found
-   Event already joined
-   Event date in the past
-   User attempting to edit or delete another user's event
-   Database or server errors

Avoid using browser `alert()` for frontend notifications. Return useful
API error messages and display them through the frontend's toast or
notification system.

------------------------------------------------------------------------

## Author

**Asif Hosen**\
Full-Stack Developer

-   Frontend: https://togetherwe-client-by-asif.vercel.app
-   GitHub: https://github.com/asif213067

------------------------------------------------------------------------

TogetherWe backend --- supporting communities through accessible event
discovery and participation.
