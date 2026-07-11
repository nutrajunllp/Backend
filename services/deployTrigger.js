const axios = require("axios");

let debounceTimer = null;
let isDeploying = false;

/**
 * Performs the actual post request to the Vercel deploy hook.
 * Uses axios with a 10-second timeout, retries up to 3 times (4 attempts total),
 * and implements exponential backoff.
 */
async function executeDeploy() {
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    console.warn("⚠️ VERCEL_DEPLOY_HOOK_URL is not defined in the environment variables. Skipping deployment trigger.");
    return;
  }

  const maxRetries = 3;
  let attempt = 0;
  let delay = 2000; // Start backoff with 2 seconds

  while (attempt <= maxRetries) {
    try {
      console.log(`🚀 Sending deploy trigger to Vercel (Attempt ${attempt + 1}/${maxRetries + 1})...`);
      const response = await axios.post(deployHookUrl, {}, { timeout: 10000 });
      console.log("✓ Deploy Triggered");
      console.log("✓ Deployment Complete");
      return;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        console.error(`❌ Failed to trigger Vercel deployment after ${maxRetries + 1} attempts. Error:`, error.message);
        break;
      }
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Vercel deployment attempt ${attempt} failed. Retrying in ${backoffDelay}ms... Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * Triggers frontend deployment asynchronously with a 60-second debounce.
 * If multiple calls occur within 60 seconds, only one deployment is triggered.
 * This function is non-blocking and returns immediately to the API client.
 */
function triggerFrontendDeploy() {
  console.log("🕒 triggerFrontendDeploy called.");
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    console.log("🕒 Deployment request debounced. Resetting 60s timer...");
  } else {
    console.log("🕒 New deployment requested. Starting 60s debounce timer...");
  }

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    
    if (isDeploying) {
      console.log("🕒 A deployment is already running. Skipping trigger to prevent duplicate deployments.");
      return;
    }

    isDeploying = true;
    try {
      await executeDeploy();
    } catch (err) {
      console.error("❌ Unhandled error in executeDeploy:", err);
    } finally {
      isDeploying = false;
    }
  }, 60000); // 60 seconds debounce
}

module.exports = {
  triggerFrontendDeploy
};
