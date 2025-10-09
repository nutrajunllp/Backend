const axios = require("axios");

module.exports.verifyWithMailboxLayer = async (email) => {
  const apiKey = "abcd1234efgh5678ijkl";

  const response = await axios.get(`http://apilayer.net/api/check`, {
    params: {
      access_key: apiKey,
      email,
      smtp: 1,
      format: 1,
    },
  });

  return response.data; // contains smtp_check, disposable, etc.
};
