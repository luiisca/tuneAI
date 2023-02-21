import type { NextApiRequest, NextApiResponse } from "next";

type CyaniteEvent = {
  version: string;
  resource: {
    type: string;
    id: string;
  };
  event: {
    type: string;
    status: string;
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("WEBHOOK handler called");
  if (req.method === "POST") {
    // set headers for opening SSE with the client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    const data = req.body as CyaniteEvent;
    console.log("WEBHOOK DATA", data);

    // end sending webhook confirmation to the client
    res.write(
      `data: ${JSON.stringify({
        status: data.event.status,
        trackId: data.resource.id,
      })}\n\n`
    );
    res.end();
  } else {
    res.status(405).json({
      message: "Method not allowed",
    });
  }
}
