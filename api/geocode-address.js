function parseCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasValidCoordinates(latitude, longitude) {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "GET requests only." });
    }

    const address = String(req.query.address || "").trim();

    if (!address) {
      return res.status(400).json({ error: "Address is required." });
    }

    const clientId = process.env.NAVER_GEOCODE_CLIENT_ID;
    const clientSecret = process.env.NAVER_GEOCODE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Geocoding environment variables are not configured." });
    }

    const url = new URL("https://maps.apigw.ntruss.com/map-geocode/v2/geocode");
    url.searchParams.set("query", address);

    const response = await fetch(url.toString(), {
      headers: {
        "x-ncp-apigw-api-key-id": clientId,
        "x-ncp-apigw-api-key": clientSecret,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: "Geocoding request failed." });
    }

    const first = Array.isArray(data.addresses) ? data.addresses[0] : null;
    const latitude = parseCoordinate(first?.y);
    const longitude = parseCoordinate(first?.x);

    if (!first || !hasValidCoordinates(latitude, longitude)) {
      return res.status(404).json({ error: "No valid coordinates found for the address." });
    }

    return res.status(200).json({
      latitude,
      longitude,
    });
  } catch (error) {
    return res.status(500).json({ error: "Geocoding server error." });
  }
}
