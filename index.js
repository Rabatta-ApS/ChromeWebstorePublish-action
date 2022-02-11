const core = require('@actions/core');
const axios = require("axios");
const child_process = require("child_process");
const fs = require('fs');
const path = require('path');

async function run(){
  try {
    const clientId = core.getInput('client-id', { required: true });
    const clientSecret = core.getInput('client-secret', { required: true });
    const refreshToken = core.getInput('refresh-token', { required: true });
    const extId = core.getInput('extension-id', {required: true});
    const pathToExtensionFolder = core.getInput('path-to-extension-folder', { required: true });
    const publishTarget = core.getInput('publishTarget', { required: false });
    const onlyUpload = core.getInput('only-upload', { required: false });
  
    const accessToken = await reqAccessToken(clientId, clientSecret, refreshToken);
    let getAccessTokenFailed = accessToken == undefined;
    if(getAccessTokenFailed){
      core.setFailed(`Failed to get ACCESS_TOKEN`);
    }
  
    zipExtension(pathToExtensionFolder);
    core.debug(`Zipped Extension`);

    await updateExtension(extId, accessToken);
    core.debug(`Only-upload is ${onlyUpload}`);

    if(onlyUpload == false){
      await publishExtension(extId, accessToken, publishTarget);
    }
  
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      core.setFailed("Something failed but there was a response");
      core.setFailed(`Response.data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      core.setFailed("Something failed without giving a response");
      core.setFailed(`Request: ${JSON.stringify(error.request)}`);
    }
    core.setFailed(error.message);
  }
}

function zipExtension(pathToFolder){
  child_process.execSync(`zip -r Target.zip ${path.resolve(pathToFolder)}`);
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
  const body = fs.readFileSync(path.resolve('./Target.zip'));
  const response = await axios.put(endpoint, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-goog-api-version': '2'
    },
    maxContentLength: Infinity
  });
  core.debug(`Update response: ${JSON.stringify(response.data)}`);
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
  core.debug(`Publish response: ${JSON.stringify(response.data)}`);
}

run();