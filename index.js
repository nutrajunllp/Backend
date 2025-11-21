const { app, server } = require("./app");
const connectDB = require("./config/db");
require("dotenv").config();

process.setMaxListeners(20);

const port = process.env.PORT || 3001;

(async () => {
  // 1️⃣ Connect DB
  await connectDB();

  // 2️⃣ Start server
  const serverInstance = server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  // 3️⃣ Global Error Handling (Promise Rejections)
  process.on("unhandledRejection", (err) => {
    console.error(`❌ Unhandled Rejection: ${err.message}`);
    serverInstance.close(() => process.exit(1));
  });

  // 4️⃣ Graceful Shutdown
  process.on("SIGINT", () => {
    console.log("🛑 Server shutting down gracefully...");

    serverInstance.close(() => {
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
  });
})();
