import { getClientById } from "./actions/clients";

async function run() {
  try {
    const clients = await getClientById("cmq6mxqxp0000gwg8csfkvvdo");
    console.log("Client found:", clients);
  } catch (error) {
    console.error("Error fetching client:", error);
  }
}

run();
