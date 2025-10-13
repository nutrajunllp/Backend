const mongoose = require("mongoose");
const { app, server } = require("./app");

// Ensure only a single event listener per process
process.setMaxListeners(20);

mongoose.set("strictQuery", true);
const port = process.env.PORT || 3001;

(async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ MongoDB Connection Successful");

    const serverInstance = server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });

    // Gracefully handle unhandled rejections (added only once)
    if (process.listenerCount("unhandledRejection") === 0) {
      process.on("unhandledRejection", (err) => {
        console.error(`❌ Unhandled Rejection: ${err.message}`);
        console.log("Shutting down the server due to Unhandled Promise Rejection");
        serverInstance.close(() => process.exit(1));
      });
    }

    // Gracefully handle termination signals (Ctrl+C)
    if (process.listenerCount("SIGINT") === 0) {
      process.on("SIGINT", () => {
        console.log("🛑 Server shutting down gracefully...");
        serverInstance.close(() => {
          mongoose.connection.close(false, () => {
            console.log("MongoDB connection closed.");
            process.exit(0);
          });
        });
      });
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
})();