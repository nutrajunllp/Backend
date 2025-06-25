const { app, server } = require('./app');
const mongoose = require("mongoose")
mongoose.set('strictQuery', true);
const port = process.env.PORT || 3001;

mongoose.connect(process.env.DB_URI).then(() => {
    console.log("Connection is Successful")
}).catch((err) => console.log(err))

const serverInstance = server.listen(port, () => {
    console.log(`Server is working on port ${port}`);
});

process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down the server due to Unhandled Promise Rejection');
    serverInstance.close(() => {
        process.exit(1);
    });
});