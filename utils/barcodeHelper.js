const bwipjs = require("bwip-js");

module.exports.generateBarcodeBase64 = (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128", // Barcode type
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
      },
      (err, png) => {
        if (err) return reject(err);
        const base64 = "data:image/png;base64," + png.toString("base64");
        resolve(base64);
      }
    );
  });
};
