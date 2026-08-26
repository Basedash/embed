import { createEmbedToken } from "@basedash/embed/server";

export async function GET() {
  const secret = process.env.BASEDASH_EMBED_JWT_SECRET;
  const orgId = process.env.BASEDASH_ORG_ID;

  if (secret === undefined || orgId === undefined) {
    return new Response("Basedash embed environment variables are missing", {
      status: 500,
    });
  }

  // Replace this example identity with the user from your authenticated session.
  const token = await createEmbedToken({
    secret,
    orgId,
    user: {
      email: "customer@example.com",
      firstName: "Example",
      lastName: "Customer",
      role: "MEMBER",
    },
  });

  return new Response(token, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
    },
  });
}
