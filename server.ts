import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import chatHandler from "./api/chat";
import healthHandler from "./api/health";

dotenv.config();

const app = express();

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const PORT =
  (process.env.RENDER || (!process.env.K_SERVICE && process.env.PORT)) &&
  process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

// Body parsers
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Existing API
app.all(["/api/health", "/health"], (req, res) =>
  healthHandler(req as any, res as any)
);

app.all(["/api/chat", "/chat", "/api/api/chat"], (req, res) =>
  chatHandler(req as any, res as any)
);

// =====================================================
// AUTHENTICATION
// =====================================================

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        error: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("SIGNUP error:", error);

    res.status(500).json({
      error: "Failed to create account.",
    });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      },
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("SIGNIN error:", error);

    res.status(500).json({
      error: "Failed to sign in.",
    });
  }
});

// =====================================================
// AUTH HELPER
// =====================================================

async function getAuthenticatedUser(req: express.Request) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.user;
}

// =====================================================
// DATABASE
// =====================================================

async function getGuestUser() {
  let user = await prisma.user.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "AskGPT User",
        email: `guest-${Date.now()}@askgpt.local`,
        passwordHash: "temporary",
      },
    });
  }

  return user;
}

// GET conversations
app.get("/api/conversations", async (_req, res) => {
  try {
    const user = await getAuthenticatedUser(_req);

if (!user) {
  return res.status(401).json({
    error: "Unauthorized",
  });
}
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error("GET conversations error:", error);

    res.status(500).json({
      error: "Failed to load conversations",
    });
  }
});

// SAVE conversation
app.post("/api/conversations", async (req, res) => {
  try {
   const user = await getAuthenticatedUser(req);

if (!user) {
  return res.status(401).json({
    error: "Unauthorized",
  });
}

    const {
      id,
      title,
      messages = [],
      createdAt,
      updatedAt,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "Conversation id is required",
      });
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        id,
      },

      create: {
        id,
        title: title || "New Chat",
        userId: user.id,
        createdAt: createdAt
          ? new Date(createdAt)
          : new Date(),
        updatedAt: updatedAt
          ? new Date(updatedAt)
          : new Date(),
      },

      update: {
        title: title || "New Chat",
        updatedAt: updatedAt
          ? new Date(updatedAt)
          : new Date(),
      },

      include: {
        messages: true,
      },
    });

    // Save messages
    for (const message of messages) {
      if (!message?.id) continue;

      const existingMessage =
        await prisma.message.findUnique({
          where: {
            id: message.id,
          },
        });

      if (!existingMessage) {
        await prisma.message.create({
          data: {
            id: message.id,
            role: message.role,
            content: message.content || "",
            conversationId: id,
            createdAt: message.timestamp
              ? new Date(message.timestamp)
              : new Date(),
          },
        });
      }
    }

    const result =
      await prisma.conversation.findUnique({
        where: {
          id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    res.json(result || conversation);
  } catch (error) {
    console.error("SAVE conversation error:", error);

    res.status(500).json({
      error: "Failed to save conversation",
    });
  }
});

// DELETE conversation
app.delete(
  "/api/conversations/:id",
  async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

if (!user) {
  return res.status(401).json({
    error: "Unauthorized",
  });
}


await prisma.conversation.delete({
  where: {
    id: req.params.id,
    userId: user.id,
  },
});

      res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "DELETE conversation error:",
        error
      );

      res.status(500).json({
        error: "Failed to delete conversation",
      });
    }
  }
);

// DELETE all conversations
app.delete("/api/conversations", async (_req, res) => {
  try {
    const user = await getAuthenticatedUser(_req);

if (!user) {
  return res.status(401).json({
    error: "Unauthorized",
  });
}

    await prisma.conversation.deleteMany({
      where: {
        userId: user.id,
      },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE all conversations error:",
      error
    );

    res.status(500).json({
      error: "Failed to clear conversations",
    });
  }
});

// =====================================================
// FRONTEND
// =====================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      "dist"
    );

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(
        path.join(distPath, "index.html")
      );
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `AskGPT server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer();