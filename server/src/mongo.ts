import { MongoClient, type Db } from "mongodb";

function mongoUri(): string {
  return String(process.env.MONGODB_URI ?? "").trim();
}

let connectPromise: Promise<MongoClient> | null = null;
let connectUri: string | null = null;

export function isMongoConfigured(): boolean {
  return mongoUri().length > 0;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = mongoUri();
  if (!uri) return null;
  if (connectPromise && connectUri !== uri) {
    await connectPromise.catch(() => undefined);
    connectPromise = null;
  }
  if (!connectPromise) {
    connectUri = uri;
    connectPromise = new MongoClient(uri).connect();
  }
  return connectPromise;
}

export async function getMongoDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  const dbName = String(process.env.MONGODB_DB ?? "sift").trim() || "sift";
  return client.db(dbName);
}

export async function mongoHealth(): Promise<{
  configured: boolean;
  ok: boolean;
  error?: string;
}> {
  const uri = mongoUri();
  if (!uri) return { configured: false, ok: true };
  try {
    const client = await getMongoClient();
    if (!client) return { configured: true, ok: false, error: "Client unavailable" };
    await client.db("admin").command({ ping: 1 });
    return { configured: true, ok: true };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
