import { MongoClient } from "mongodb";
const state = globalThis as typeof globalThis & {
  fcMongo?: Promise<MongoClient>;
};
export async function database() {
  if (!process.env.MONGODB_URI) throw new Error("Database not configured");
  if (!state.fcMongo) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    state.fcMongo = client.connect().catch((e) => {
      delete state.fcMongo;
      throw e;
    });
  }
  return (await state.fcMongo).db("fc_capital");
}
