import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;
let authUrl;

function getAuthConfig() {
  if (!jwks) {
    authUrl = (process.env.CLIENT_URL ?? "").replace(/\/+$/, "");

    if (!authUrl) {
      throw new Error("Missing CLIENT_URL environment variable");
    }

    jwks = createRemoteJWKSet(new URL(`${authUrl}/api/auth/jwks`));
  }

  return { jwks, authUrl };
}

export async function verifyToken(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const config = getAuthConfig();

    const { payload } = await jwtVerify(token, config.jwks, {
      issuer: config.authUrl,
      audience: config.authUrl,
    });

    const id = payload.sub ?? payload.id;

    if (!id || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id,
      email: payload.email,
      name: payload.name,
      image: payload.image ?? null,
      };

    // req.user = {
    //   id,
    //   email: payload.email,
    //   emailVerified: payload.emailVerified === true,
    //   name: payload.name,
    //   image: payload.image ?? null,
    // };

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}
