export interface DevEventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  images: string[];
  participantIds: string[];
  participants?: Array<{ id: string; username: string }>;
  eventDate: string;
  location: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  isFromDatabase?: boolean;
}

const initialSeedEvents: DevEventItem[] = [
  {
    id: "evt-sample-1",
    title: "Jyoti Sarup Kanya Asra Orphanage Visit",
    description:
      "A heartwarming day filled with interactive learning, arts & crafts workshops, and meal sharing with 45 wonderful children at Jyoti Sarup Kanya Asra. Volunteers conducted educational games and distributed essential stationery kits.",
    eventType: "VISIT",
    images: [
      "/assets/images/AsraVisit.jpg",
      "/assets/images/BlindInstitute.jpeg",
    ],
    participantIds: ["usr-dev-1", "usr-dev-2", "usr-dev-4"],
    participants: [
      { id: "usr-dev-1", username: "aryan_vasudev" },
      { id: "usr-dev-2", username: "priya_sharma" },
      { id: "usr-dev-4", username: "ananya_singh" },
    ],
    eventDate: new Date("2026-03-12T10:00:00.000Z").toISOString(),
    location: "Kharar, Mohali, Punjab",
    startTime: "10:00 AM",
    endTime: "03:30 PM",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt-sample-2",
    title: "Sonorous GBM & Impact Summit 2026",
    description:
      "Annual General Body Meeting bringing together volunteers, project leads, and community partners to review milestone achievements, brainstorm future initiatives, and induct new members into our core teams.",
    eventType: "GBM",
    images: [
      "/assets/images/Sonorous.jpeg",
      "/assets/images/KartarAsra.jpeg",
    ],
    participantIds: ["usr-dev-1", "usr-dev-3", "usr-dev-5"],
    participants: [
      { id: "usr-dev-1", username: "aryan_vasudev" },
      { id: "usr-dev-3", username: "rohit_verma" },
      { id: "usr-dev-5", username: "karan_malhotra" },
    ],
    eventDate: new Date("2026-04-05T14:00:00.000Z").toISOString(),
    location: "Main Auditorium, UIET Campus, Chandigarh",
    startTime: "02:00 PM",
    endTime: "06:00 PM",
    status: "UPCOMING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt-sample-3",
    title: "Community Braille & Audio Outreach Drive",
    description:
      "A hands-on initiative at the Institute for the Blind focusing on reading sessions, recording audio textbooks for higher education students, and conducting assistive digital technology demos.",
    eventType: "COMMUNITY",
    images: [
      "/assets/images/BlindInstitute.jpeg",
      "/assets/images/AsraVisit.jpg",
    ],
    participantIds: ["usr-dev-2", "usr-dev-3", "usr-dev-4", "usr-dev-5"],
    participants: [
      { id: "usr-dev-2", username: "priya_sharma" },
      { id: "usr-dev-3", username: "rohit_verma" },
      { id: "usr-dev-4", username: "ananya_singh" },
      { id: "usr-dev-5", username: "karan_malhotra" },
    ],
    eventDate: new Date("2026-04-20T09:30:00.000Z").toISOString(),
    location: "Institute for the Blind, Sector 26, Chandigarh",
    startTime: "09:30 AM",
    endTime: "01:30 PM",
    status: "UPCOMING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Global in-memory store shared across Next.js API handlers in development
const globalForEvents = globalThis as unknown as { devEvents?: DevEventItem[] };

if (!globalForEvents.devEvents) {
  globalForEvents.devEvents = initialSeedEvents;
}

export const devEventsStore = globalForEvents.devEvents;
