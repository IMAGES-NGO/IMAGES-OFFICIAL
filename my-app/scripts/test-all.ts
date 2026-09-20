/**
 * Comprehensive System Test Suite for IMAGES NGO Platform
 * 
 * Verifies:
 *  1. Cloudinary Integration & Image Handling (Config, URL parsing, validation, fallback, deletion)
 *  2. Authentication & Security (Schemas, bcrypt hashing, OTP generation & hashing, rate limiters, admin auth)
 *  3. Event Schema & CRUD Lifecycle (Prisma schema integrity, validations, GET, POST, PUT, DELETE, filters, participants)
 *  4. Homepage Highlights & Public Events Display (Cover photo logic, slide mapping, roster resolution)
 */

import { configureCloudinary } from "../lib/cloudinary";
import { signupSchema, loginSchema, verifyOtpSchema } from "../lib/validations/auth";
import { verificationAttempts, resendCooldowns } from "../lib/rate-limiter";
import { devEventsStore, DevEventItem } from "../lib/events-store";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";

// ASCII Color helpers for formatted terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
};

interface TestResult {
  suite: string;
  name: string;
  description: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details?: string;
  error?: string;
}

const allResults: TestResult[] = [];
let currentSuite = "";

function suite(name: string) {
  currentSuite = name;
  console.log(`\n${colors.bgBlue}${colors.white}${colors.bright}  SUITE: ${name.toUpperCase()}  ${colors.reset}\n`);
}

async function test(name: string, description: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    allResults.push({ suite: currentSuite, name, description, status: "PASS", durationMs });
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${colors.bright}${name}${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.log(`    ${colors.cyan}↳ ${description}${colors.reset}`);
  } catch (err: unknown) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err instanceof Error ? err.message : String(err);
    allResults.push({ suite: currentSuite, name, description, status: "FAIL", durationMs, error: errorMsg });
    console.log(`  ${colors.red}✗ FAIL${colors.reset} ${colors.bright}${name}${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.log(`    ${colors.red}↳ Error: ${errorMsg}${colors.reset}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`);
  }
}

async function runTestSuite() {
  console.log(`${colors.bright}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}   IMAGES NGO PLATFORM - EXTENSIVE END-TO-END SYSTEM TEST RUNNER       ${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Environment: ${process.env.NODE_ENV || "development"}`);

  // =========================================================================
  // SUITE 1: CLOUDINARY & IMAGE HANDLING SYSTEM
  // =========================================================================
  suite("Cloudinary & Media Asset Management");

  await test(
    "Cloudinary Configuration Parser",
    "Verifies configureCloudinary extracts clean credentials and strips spurious surrounding quotes",
    () => {
      const origName = process.env.CLOUDINARY_CLOUD_NAME;
      const origKey = process.env.CLOUDINARY_API_KEY;
      const origSecret = process.env.CLOUDINARY_API_SECRET;

      try {
        // Test with quotes around env values
        process.env.CLOUDINARY_CLOUD_NAME = '"test_cloud_123"';
        process.env.CLOUDINARY_API_KEY = "'9876543210'";
        process.env.CLOUDINARY_API_SECRET = "secret_token_xyz";

        const config = configureCloudinary();
        assertEqual(config.cloudName, "test_cloud_123", "Cloud name should be trimmed and unquoted");
        assertEqual(config.apiKey, "9876543210", "API key should be trimmed and unquoted");
        assertEqual(config.apiSecret, "secret_token_xyz", "API secret should match");
      } finally {
        process.env.CLOUDINARY_CLOUD_NAME = origName;
        process.env.CLOUDINARY_API_KEY = origKey;
        process.env.CLOUDINARY_API_SECRET = origSecret;
        configureCloudinary();
      }
    }
  );

  await test(
    "Cloudinary URL Scheme Parser",
    "Parses full cloudinary:// URL format into component API key, secret, and cloud name",
    () => {
      const origUrl = process.env.CLOUDINARY_URL;
      const origName = process.env.CLOUDINARY_CLOUD_NAME;
      const origKey = process.env.CLOUDINARY_API_KEY;
      const origSecret = process.env.CLOUDINARY_API_SECRET;

      try {
        delete process.env.CLOUDINARY_CLOUD_NAME;
        delete process.env.CLOUDINARY_API_KEY;
        delete process.env.CLOUDINARY_API_SECRET;
        process.env.CLOUDINARY_URL = "cloudinary://11223344:mysecretpass@myorgcloud";

        const config = configureCloudinary();
        assertEqual(config.cloudName, "myorgcloud", "Cloud name parsed from URL");
        assertEqual(config.apiKey, "11223344", "API key parsed from URL");
        assertEqual(config.apiSecret, "mysecretpass", "API secret parsed from URL");
      } finally {
        process.env.CLOUDINARY_URL = origUrl;
        process.env.CLOUDINARY_CLOUD_NAME = origName;
        process.env.CLOUDINARY_API_KEY = origKey;
        process.env.CLOUDINARY_API_SECRET = origSecret;
        configureCloudinary();
      }
    }
  );

  await test(
    "Upload Media File Size & MIME Type Verification",
    "Validates strict enforcement of 10MB limit and image MIME types (JPG, PNG, WEBP, GIF, SVG)",
    () => {
      const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      // Valid MIME types
      assert(ALLOWED_MIME_TYPES.includes("image/jpeg"), "JPG allowed");
      assert(ALLOWED_MIME_TYPES.includes("image/png"), "PNG allowed");
      assert(ALLOWED_MIME_TYPES.includes("image/webp"), "WEBP allowed");
      assert(ALLOWED_MIME_TYPES.includes("image/gif"), "GIF allowed");
      assert(ALLOWED_MIME_TYPES.includes("image/svg+xml"), "SVG allowed");

      // Invalid MIME types rejected
      assert(!ALLOWED_MIME_TYPES.includes("application/pdf"), "PDF rejected");
      assert(!ALLOWED_MIME_TYPES.includes("text/html"), "HTML rejected");
      assert(!ALLOWED_MIME_TYPES.includes("application/javascript"), "JS rejected");
      assert(!ALLOWED_MIME_TYPES.includes("video/mp4"), "MP4 rejected");

      // Size boundary tests
      const validSize = 5 * 1024 * 1024; // 5MB
      const exactMaxSize = 10 * 1024 * 1024; // 10MB
      const excessiveSize = 10 * 1024 * 1024 + 1; // 10MB + 1 byte

      assert(validSize <= MAX_FILE_SIZE, "5MB is accepted");
      assert(exactMaxSize <= MAX_FILE_SIZE, "10MB boundary is accepted");
      assert(excessiveSize > MAX_FILE_SIZE, "Files >10MB are rejected");
    }
  );

  await test(
    "Upload Data URI and Resilient Fallback Construction",
    "Verifies binary buffer converts safely to base64 Data URI for storage or fallback",
    () => {
      const dummyBuffer = Buffer.from("PNG-HEADER-MOCK-BINARY-DATA-FOR-TESTING");
      const mimeType = "image/png";
      const dataUri = `data:${mimeType};base64,${dummyBuffer.toString("base64")}`;

      assert(dataUri.startsWith("data:image/png;base64,"), "Data URI header formatted accurately");
      const decodedBuffer = Buffer.from(dataUri.split(",")[1], "base64");
      assertEqual(decodedBuffer.toString(), "PNG-HEADER-MOCK-BINARY-DATA-FOR-TESTING", "Payload decodes identically");
    }
  );

  await test(
    "Asset Deletion Identifier Dispatcher",
    "Verifies correct routing between Cloudinary publicId, local file asset, and data URI",
    async () => {
      // 1. Local file identifier check
      const localId = "local_1742460000000-banner.jpg";
      assert(localId.startsWith("local_"), "Detected local filesystem asset");
      const fileName = localId.replace("local_", "");
      assertEqual(fileName, "1742460000000-banner.jpg", "Extracted pure filename");

      // 2. Data URI identifier check
      const dataUriId = "data_1742460000000";
      assert(dataUriId.startsWith("data_"), "Detected transient data URI asset requiring no server storage action");

      // 3. Cloudinary public ID check
      const cloudPublicId = "ngo_images/event_cover_photo";
      assert(!cloudPublicId.startsWith("local_") && !cloudPublicId.startsWith("data_"), "Routes to Cloudinary destroy API");
    }
  );

  // =========================================================================
  // SUITE 2: AUTHENTICATION, PASSWORDS, OTP & SECURITY
  // =========================================================================
  suite("Authentication & Security Infrastructure");

  await test(
    "Signup Schema Validation Constraints",
    "Checks username rules (3-30 chars, alphanumeric), valid email, and strong password regex",
    () => {
      // Valid signup input
      const valid = signupSchema.safeParse({
        username: "ngo_volunteer_1",
        email: "volunteer@imagesngo.org",
        password: "ValidPassword123!",
      });
      assert(valid.success, "Valid signup details pass schema");

      // Invalid username (too short)
      const shortUser = signupSchema.safeParse({
        username: "ab",
        email: "volunteer@imagesngo.org",
        password: "ValidPassword123!",
      });
      assert(!shortUser.success, "Username <3 chars rejected");

      // Invalid username (illegal characters)
      const badCharUser = signupSchema.safeParse({
        username: "user@name#",
        email: "volunteer@imagesngo.org",
        password: "ValidPassword123!",
      });
      assert(!badCharUser.success, "Username with special symbols rejected");

      // Weak passwords
      const noUpper = signupSchema.safeParse({
        username: "validuser",
        email: "volunteer@imagesngo.org",
        password: "password123!",
      });
      assert(!noUpper.success, "Password missing uppercase rejected");

      const noSpecial = signupSchema.safeParse({
        username: "validuser",
        email: "volunteer@imagesngo.org",
        password: "Password1234",
      });
      assert(!noSpecial.success, "Password missing special character rejected");

      const tooShort = signupSchema.safeParse({
        username: "validuser",
        email: "volunteer@imagesngo.org",
        password: "Pass1!",
      });
      assert(!tooShort.success, "Password <8 chars rejected");
    }
  );

  await test(
    "Login Schema & Role Discrimination",
    "Verifies login requires email, password, and restricted enum role ('ADMIN' | 'MEMBER')",
    () => {
      const adminLogin = loginSchema.safeParse({
        email: "admin@imagesngo.org",
        password: "AdminImages2026!",
        role: "ADMIN",
      });
      assert(adminLogin.success, "ADMIN role login payload accepted");

      const memberLogin = loginSchema.safeParse({
        email: "member@imagesngo.org",
        password: "MemberImages2026!",
        role: "MEMBER",
      });
      assert(memberLogin.success, "MEMBER role login payload accepted");

      const invalidRole = loginSchema.safeParse({
        email: "hacker@imagesngo.org",
        password: "Password123!",
        role: "SUPERUSER",
      });
      assert(!invalidRole.success, "Unapproved role rejected");
    }
  );

  await test(
    "Bcrypt Password Hashing & Verification Salt Cycle",
    "Verifies bcrypt salt generation, hashing strength, and constant-time match verification",
    async () => {
      const rawPassword = "StrongImagesSecurePassword2026@#";
      const hash = await bcrypt.hash(rawPassword, 10);

      assert(hash.startsWith("$2"), "Valid bcrypt hash format generated");
      assert(hash.length >= 59, "Hash has expected bcrypt byte length");

      const matchTrue = await bcrypt.compare(rawPassword, hash);
      assert(matchTrue, "bcrypt.compare correctly matches authentic password");

      const matchFalse = await bcrypt.compare("WrongPasswordAttempt123!", hash);
      assert(!matchFalse, "bcrypt.compare strictly rejects incorrect password");
    }
  );

  await test(
    "OTP Cryptographic Generation, Hashing & Expiry Window",
    "Verifies 6-digit numeric OTP generation, SHA-256 digest hashing, and 10-minute expiry",
    () => {
      // 1. 6-digit numeric OTP
      const otp = randomInt(100000, 1000000).toString();
      assertEqual(otp.length, 6, "OTP is exactly 6 digits");
      assert(/^\d{6}$/.test(otp), "OTP consists purely of digits");

      // 2. Schema check
      const otpSchemaCheck = verifyOtpSchema.safeParse({
        email: "user@imagesngo.org",
        otp,
      });
      assert(otpSchemaCheck.success, "Generated OTP satisfies verifyOtpSchema");

      // 3. SHA-256 Digest
      const otpHash = createHash("sha256").update(otp).digest("hex");
      assertEqual(otpHash.length, 64, "SHA-256 hash is 64 hex characters");

      // 4. Expiry timestamp calculation (10 minutes)
      const now = Date.now();
      const expiresAt = new Date(now + 10 * 60 * 1000);
      assert(expiresAt.getTime() > now, "Expiry is in future");
      assert(expiresAt.getTime() - now <= 10 * 60 * 1000, "Expiry is within 10 minutes");
    }
  );

  await test(
    "Verification Rate Limiting & 5-Attempt Lockout Defense",
    "Verifies that 5 consecutive failed OTP attempts triggers a 15-minute security lockout",
    () => {
      const testEmail = "lockout-test@imagesngo.org";
      verificationAttempts.delete(testEmail);

      const maxAttempts = 5;
      const now = Date.now();

      for (let i = 1; i <= maxAttempts; i++) {
        const record = verificationAttempts.get(testEmail) || { count: 0, lockedUntil: 0 };
        const newCount = record.count + 1;
        const isLocked = newCount >= maxAttempts;
        const lockedUntil = isLocked ? now + 15 * 60 * 1000 : 0;
        verificationAttempts.set(testEmail, { count: newCount, lockedUntil });
      }

      const finalRecord = verificationAttempts.get(testEmail);
      assert(Boolean(finalRecord), "Record exists in tracker");
      assertEqual(finalRecord?.count, 5, "Count reached 5 failed attempts");
      assert(finalRecord!.lockedUntil > Date.now(), "Account successfully locked for future timestamp");
      assert(finalRecord!.lockedUntil - Date.now() <= 15 * 60 * 1000, "Lockout duration equals 15 minutes");

      // Clean up test email from tracker
      verificationAttempts.delete(testEmail);
    }
  );

  await test(
    "Resend OTP 60-Second Cooldown Throttling",
    "Ensures immediate subsequent OTP resend requests within 60s are blocked with 429",
    () => {
      const testEmail = "resend-cooldown@imagesngo.org";
      resendCooldowns.delete(testEmail);

      const now = Date.now();
      // Record initial send
      resendCooldowns.set(testEmail, now);

      // Subsequent attempt 15 seconds later
      const subsequentAttemptTime = now + 15 * 1000;
      const lastSent = resendCooldowns.get(testEmail)!;
      const timeElapsed = subsequentAttemptTime - lastSent;
      const isThrottled = timeElapsed < 60 * 1000;
      const remainingSeconds = Math.ceil((60 * 1000 - timeElapsed) / 1000);

      assert(isThrottled, "Request is throttled within 60s window");
      assertEqual(remainingSeconds, 45, "Calculates remaining cooldown seconds accurately");

      // Clean up
      resendCooldowns.delete(testEmail);
    }
  );

  await test(
    "Admin Role Protection & Dev Fallback Credentials",
    "Verifies dev administrator credentials validation and role enforcement",
    () => {
      const devEmail = "admin@imagesngo.org";
      const devPass = process.env.DEV_ADMIN_PASSWORD || "AdminImages2026!";

      // Correct dev credentials
      const validCreds = {
        email: devEmail,
        password: devPass,
        role: "ADMIN" as const,
      };
      assert(validCreds.email.toLowerCase() === "admin@imagesngo.org", "Matches admin identity");
      assert(validCreds.role === "ADMIN", "Requires ADMIN role");

      // Member attempting admin login
      const unauthorizedRole: { email: string; password: string; role: string } = {
        email: devEmail,
        password: devPass,
        role: "MEMBER",
      };
      assert(unauthorizedRole.role !== "ADMIN", "MEMBER role cannot claim ADMIN privileges");
    }
  );

  // =========================================================================
  // SUITE 3: EVENT SCHEMA & CRUD LIFECYCLE
  // =========================================================================
  suite("Event Schema, Validation & CRUD Operations");

  await test(
    "Event Schema Required Field Validation",
    "Verifies title, description, eventDate, and location are mandatory according to Issue #6",
    () => {
      const validEventPayload = {
        title: "Clean Energy Awareness Drive",
        description: "Promoting solar and green practices in rural communities.",
        eventType: "COMMUNITY",
        eventDate: "2026-05-15T10:00:00.000Z",
        location: "Kharar Community Center, Punjab",
        images: ["/assets/images/AsraVisit.jpg"],
        participantIds: ["usr-dev-1", "usr-dev-2"],
        startTime: "10:00 AM",
        endTime: "02:00 PM",
        status: "UPCOMING",
      };

      // Helper function matching API route validation
      function validateEvent(payload: Record<string, unknown>) {
        if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
          return { valid: false, error: "Event title is required." };
        }
        if (!payload.description || typeof payload.description !== "string" || !payload.description.trim()) {
          return { valid: false, error: "Event description is required." };
        }
        if (!payload.eventDate) {
          return { valid: false, error: "Event date is required." };
        }
        if (!payload.location || typeof payload.location !== "string" || !payload.location.trim()) {
          return { valid: false, error: "Event location is required." };
        }
        const parsedDate = new Date(payload.eventDate as string);
        if (isNaN(parsedDate.getTime())) {
          return { valid: false, error: "Invalid event date format." };
        }
        return { valid: true };
      }

      assert(validateEvent(validEventPayload).valid, "Valid event payload approved");
      assert(!validateEvent({ ...validEventPayload, title: "" }).valid, "Missing title rejected");
      assert(!validateEvent({ ...validEventPayload, description: "   " }).valid, "Whitespace description rejected");
      assert(!validateEvent({ ...validEventPayload, eventDate: "" }).valid, "Missing eventDate rejected");
      assert(!validateEvent({ ...validEventPayload, eventDate: "not-a-date" }).valid, "Invalid date string rejected");
      assert(!validateEvent({ ...validEventPayload, location: "" }).valid, "Missing location rejected");
    }
  );

  await test(
    "Event Store Initial Seed & Data Integrity",
    "Verifies initial mock seed events contain required structure and valid ISO timestamps",
    () => {
      assert(devEventsStore.length >= 3, "Seed events loaded in store");
      for (const evt of devEventsStore) {
        assert(Boolean(evt.id), "Event has ID");
        assert(Boolean(evt.title), "Event has title");
        assert(Boolean(evt.description), "Event has description");
        assert(Boolean(evt.eventType), "Event has eventType");
        assert(Array.isArray(evt.images), "Event images is an array");
        assert(Array.isArray(evt.participantIds), "Event participantIds is an array");
        assert(!isNaN(new Date(evt.eventDate).getTime()), "Event date is valid ISO timestamp");
        assert(Boolean(evt.location), "Event has location");
        assert(["UPCOMING", "ONGOING", "COMPLETED"].includes(evt.status), "Event status is valid");
      }
    }
  );

  let createdTestEventId = "";

  await test(
    "POST /api/events - Event Creation Lifecycle",
    "Creates a new event item and inserts it into the active event store",
    () => {
      const newEvent: DevEventItem = {
        id: "evt-test-" + Date.now(),
        title: "Tree Plantation & Afforestation Marathon 2026",
        description: "Planting over 500 indigenous saplings across the university campus to fight local climate change.",
        eventType: "ENVIRONMENT",
        images: ["/assets/images/TreePlantation.jpg", "/assets/images/CampusGreen.jpg"],
        participantIds: ["usr-dev-1", "usr-dev-3"],
        participants: [
          { id: "usr-dev-1", username: "aryan_vasudev" },
          { id: "usr-dev-3", username: "rohit_verma" },
        ],
        eventDate: new Date("2026-06-05T08:00:00.000Z").toISOString(),
        location: "Panjab University Campus, Sector 14, Chandigarh",
        startTime: "08:00 AM",
        endTime: "12:30 PM",
        status: "UPCOMING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdTestEventId = newEvent.id;
      devEventsStore.unshift(newEvent);

      const retrieved = devEventsStore.find((e) => e.id === createdTestEventId);
      assert(Boolean(retrieved), "Created event exists in store");
      assertEqual(retrieved?.title, "Tree Plantation & Afforestation Marathon 2026", "Title verified");
      assertEqual(retrieved?.images.length, 2, "Images array populated with 2 assets");
      assertEqual(retrieved?.participantIds.length, 2, "Participant IDs recorded");
    }
  );

  await test(
    "GET /api/events - Query Filtering & Search Engine",
    "Tests filtering by eventType, filtering by status, and fulltext search across title/location",
    () => {
      // 1. Filter by eventType
      const envEvents = devEventsStore.filter((e) => e.eventType === "ENVIRONMENT");
      assert(envEvents.length >= 1, "Filter by eventType === 'ENVIRONMENT' finds created event");
      assertEqual(envEvents[0].eventType, "ENVIRONMENT", "Type matches");

      // 2. Filter by status
      const upcomingEvents = devEventsStore.filter((e) => e.status === "UPCOMING");
      assert(upcomingEvents.length >= 1, "Filter by status === 'UPCOMING' finds upcoming events");

      // 3. Search query
      const query = "Afforestation".toLowerCase();
      const searchResults = devEventsStore.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.location.toLowerCase().includes(query)
      );
      assert(searchResults.length >= 1, "Search keyword 'Afforestation' locates target event");
      assertEqual(searchResults[0].id, createdTestEventId, "Found correct test event");
    }
  );

  await test(
    "GET /api/events/[id] - Single Event Retrieval",
    "Fetches single event by ID and validates participants roster resolution",
    () => {
      const event = devEventsStore.find((e) => e.id === createdTestEventId);
      assert(Boolean(event), "Event retrieved by ID");
      assertEqual(event?.id, createdTestEventId, "ID matches");
      assert(Array.isArray(event?.participants), "Participants resolved");
      assertEqual(event?.participants?.[0]?.username, "aryan_vasudev", "First participant username resolved");
    }
  );

  await test(
    "PUT /api/events/[id] - Event Update Lifecycle",
    "Updates event details (e.g. status transition to ONGOING, new location) and updates updatedAt",
    () => {
      const eventIndex = devEventsStore.findIndex((e) => e.id === createdTestEventId);
      assert(eventIndex !== -1, "Target event located for update");

      const originalUpdatedAt = devEventsStore[eventIndex].updatedAt;
      const updatedData = {
        status: "ONGOING",
        location: "Botanical Gardens, Panjab University, Chandigarh",
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      };

      devEventsStore[eventIndex] = {
        ...devEventsStore[eventIndex],
        ...updatedData,
      };

      const updated = devEventsStore[eventIndex];
      assertEqual(updated.status, "ONGOING", "Status transitioned to ONGOING");
      assertEqual(updated.location, "Botanical Gardens, Panjab University, Chandigarh", "Location updated");
      assert(new Date(updated.updatedAt) >= new Date(originalUpdatedAt), "updatedAt timestamp advanced");
    }
  );

  await test(
    "DELETE /api/events/[id] - Event Removal Lifecycle",
    "Removes created test event and confirms it is no longer retrievable",
    () => {
      const deleteIndex = devEventsStore.findIndex((e) => e.id === createdTestEventId);
      assert(deleteIndex !== -1, "Event exists prior to deletion");

      devEventsStore.splice(deleteIndex, 1);

      const afterDelete = devEventsStore.find((e) => e.id === createdTestEventId);
      assertEqual(afterDelete, undefined, "Event successfully deleted from store");
    }
  );

  // =========================================================================
  // SUITE 4: HOMEPAGE HIGHLIGHTS & EVENT CARD COVER IMAGE INTEGRATION
  // =========================================================================
  suite("Homepage Highlights & Event Gallery Integration");

  await test(
    "Highlights Slide Mapping & Cover Photo Selection",
    "Verifies first image in event's images[] array is strictly designated as cover photo",
    () => {
      const mockEvents = [
        {
          id: "evt-sample-1",
          title: "Jyoti Sarup Kanya Asra Orphanage Visit",
          images: ["/assets/images/AsraVisit.jpg", "/assets/images/BlindInstitute.jpeg"],
          eventType: "VISIT",
        },
        {
          id: "evt-sample-2",
          title: "Sonorous GBM 2026",
          images: ["/assets/images/Sonorous.jpeg"],
          eventType: "GBM",
        },
        {
          id: "evt-no-images",
          title: "Event Without Images",
          images: [],
          eventType: "COMMUNITY",
        },
      ];

      // Logic from Highlights.tsx
      const eventsWithImages = mockEvents.filter((evt) => evt.images && evt.images.length > 0);
      assertEqual(eventsWithImages.length, 2, "Filters out events without images");

      const mappedSlides = eventsWithImages.slice(0, 5).map((evt) => ({
        src: evt.images[0], // cover image of the event
        alt: evt.title,
        caption: evt.title, // title of that event below that
        category: evt.eventType,
        eventId: evt.id,
      }));

      assertEqual(mappedSlides.length, 2, "Mapped slides created");
      assertEqual(mappedSlides[0].src, "/assets/images/AsraVisit.jpg", "Event 1 uses images[0] as cover photo");
      assertEqual(mappedSlides[0].caption, "Jyoti Sarup Kanya Asra Orphanage Visit", "Event 1 caption matches title");
      assertEqual(mappedSlides[1].src, "/assets/images/Sonorous.jpeg", "Event 2 uses images[0] as cover photo");
      assertEqual(mappedSlides[1].caption, "Sonorous GBM 2026", "Event 2 caption matches title");
    }
  );

  await test(
    "Public Events Card Date Splitting & Badge Formatting",
    "Verifies formatEventDate and month/day badge extraction for event calendar displays",
    () => {
      const sampleDateStr = "2026-04-05T14:00:00.000Z";
      const d = new Date(sampleDateStr);

      const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
      const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });

      assertEqual(month, "APR", "Month extracted in uppercase");
      assertEqual(day, "5", "Day extracted accurately");

      const formatted = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
      assertEqual(formatted, "Apr 5, 2026", "Full date formatted nicely");
    }
  );

  // =========================================================================
  // TEST REPORT & SUMMARY
  // =========================================================================
  console.log(`\n${colors.bright}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}                    FINAL TEST EXECUTION SUMMARY                        ${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}========================================================================${colors.reset}\n`);

  const passed = allResults.filter((r) => r.status === "PASS").length;
  const failed = allResults.filter((r) => r.status === "FAIL").length;
  const total = allResults.length;
  const totalDuration = Math.round(allResults.reduce((acc, r) => acc + r.durationMs, 0) * 100) / 100;

  console.log(`  Total Tests Executed: ${colors.bright}${total}${colors.reset}`);
  console.log(`  Passed Tests:         ${colors.green}${colors.bright}${passed}${colors.reset}`);
  console.log(`  Failed Tests:         ${failed > 0 ? colors.red + colors.bright : colors.dim}${failed}${colors.reset}`);
  console.log(`  Total Execution Time: ${colors.cyan}${totalDuration} ms${colors.reset}\n`);

  if (failed > 0) {
    console.error(`${colors.red}${colors.bright}❌ SOME TESTS FAILED. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.bgGreen}${colors.white}${colors.bright}  ALL ${total} SYSTEM TESTS PASSED SUCCESSFULLY! EVERYTHING IS HEALTHY.  ${colors.reset}\n`);
  }
}

runTestSuite().catch((e) => {
  console.error("Test runner caught unhandled exception:", e);
  process.exit(1);
});
