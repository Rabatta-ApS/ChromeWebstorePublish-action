const core = require('@actions/core');
const github = require('@actions/github');
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
    const version = core.getInput('latestReleaseVersion', {required: true});
  
    const newVersion = await getNewVersionNumber(version);

    process.env.RABATTA_VERSION = newVersion;
    core.setOutput('tag',`v${newVersion}`);

    buildExtension();

    const accessToken = await reqAccessToken(clientId, clientSecret, refreshToken);
    let getAccessTokenFailed = accessToken == undefined;
    if(getAccessTokenFailed){
      core.setFailed(`Failed to get ACCESS_TOKEN`);
    }
  
    zipExtension(pathToExtensionFolder);
    core.debug(`Zipped Extension`);

    await updateExtension(extId, accessToken);
    core.debug(`Only-upload is ${onlyUpload}`);

    if(onlyUpload !== "true"){
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

async function getNewVersionNumber(version){

  const versionNumbers = version.match(/\d/g);

  for(let i = 0; i < versionNumbers.length; i++){
    versionNumbers[i] = Number.parseInt(versionNumbers[i]);
  }

  const labels = await getLabels();

  if (labels.length == 0) {
    core.info("No labels found")

    const err = new Error("No labels found");
    throw err;
  }

  for(const label of labels){
    core.debug(label);
    if(label == "release:major"){
      versionNumbers[0]++;
    } 
    else if(label == "release:minor"){
      versionNumbers[1]++;

    }
    else if(label == "release:patch"){
      versionNumbers[2]++;
    }
  }

  const versionString = `${versionNumbers[0]}.${versionNumbers[1]}.${versionNumbers[2]}`;
  return versionString;
}

async function getLabels(){
  const token = core.getInput("github-token", { required: true });
  const octokit = github.getOctokit(token);
  const context = github.context;
  core.debug(JSON.stringify(context.payload));

  const res = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner: context.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number
  })
  const labels = res.labels;
  return labels ? labels.map(label => label.name) : [];
}

function buildExtension(){
  child_process.execSync(`npm run build`);
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

function zipExtension(pathToFolder){
  child_process.execSync(`zip -r Target.zip ${path.resolve(pathToFolder)}`);
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

  if(response.data.error_detail){
    const err = new Error(response.data.error_detail);
    err.response = response;
    throw err;
  }

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