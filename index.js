const core = require('@actions/core');
const github = require('@actions/github');
const child_process = require("child_process");
import fs from 'fs';
import path from 'path';

try {
  const clientId = core.getInput('client-id', { required: true });
  const clientSecret = core.getInput('client-secret', { required: true });
  const refreshToken = core.getInput('refresh-token', { required: true });
  const extId = core.getInput('extension-id', {required: true});
  const pathToExtensionFolder = core.getInput('path-to-extension-folder', { required: true });
  const publishTarget = core.getInput('publishTarget', { required: false });

  const accessToken = await reqAccessToken(clientId, clientSecret, refreshToken);
  core.debug(`Token: ${token}`);

  zipExtionsion(pathToExtensionFolder);
  await updateExtension(extId, accessToken);
  await publishAddon(extId, accessToken, publishTarget);

} catch (error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    core.debug("ERROR but got a response");
    core.debug(error.response.data);
    core.debug(error.response.status);
    core.debug(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    core.debug("ERROR and no response recieved");
    core.debug(error.request);
  }
  core.debug(error.config);
  core.setFailed(error.message);
}

function zipExtionsion(path){
  child_process.execSync(`zip -r Rabatta.zip *`, {
    cwd: 'dist'
  });
}

async function reqAccessToken(clientId, clientSecret, refreshToken) {
  const response = await axios.post('https://www.googleapis.com/oauth2/v4/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  return response.data.access_token;
}

async function updateExtension(extId, accessToken) {
  const endpoint = `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extId}?uploadType=media`;
  const body = fs.readFileSync(path.resolve('./Rabatta.zip'));
  const response = await axios.put(endpoint, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-goog-api-version': '2'
    },
    maxContentLength: Infinity
  });
  core.debug(`Response: ${JSON.stringify(response.data)}`);
}

async function publishExtension(extId, accessToken, publishTarget) {
  const endpoint = `https://www.googleapis.com/chromewebstore/v1.1/items/${extId}/publish`;
  const response = await axios.post(
    endpoint,
    { target: publishTarget },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-api-version': '2'
      }
    }
  );
  core.debug(`Response: ${JSON.stringify(response.data)}`);
}