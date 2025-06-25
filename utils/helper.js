const OrderCounter = require("../models/orderCounterModel");

module.exports.extractFolderAndFilename = (imageUrl) => {
  const segments = imageUrl.split("/");
  if (segments.length < 2) {
    throw new Error('Invalid image URL format. Expected "folderName/filename"');
  }
  const filename = segments.pop();
  const folderName = segments.join("/");
  return { folderName, filename };
};

module.exports.generateOrderID = async () => {
  let generator = await OrderCounter.findOne();

  if (!generator) {
    generator = await OrderCounter.create({ lastOrderNumber: 10001 });
  } else {
    generator.lastOrderNumber += 1;
    await generator.save();
  }

  return String(generator.lastOrderNumber);
};
