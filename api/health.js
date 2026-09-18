module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    service: "music-city-ai",
    ok: true,
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    timestamp: new Date().toISOString()
  });
};
