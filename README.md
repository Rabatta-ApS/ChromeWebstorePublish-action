# ChromeWebstorePublish-action
A Github action for updating and publishing a chrome extenstion to the Chrome Webstore

## Inputs

### path-to-extension-folder
**Required** 
The folder where the chrome extension is located

### extension-id
**Required** 
The id of the extension. Can be seen in the webstore url

### client-id
**Required** 
The Google OAuth2 client id allowed to operate the Chrome webstore api

### client-secret
**Required** 
Google OAuth2 client secret

### refresh-token
**Required** 
Google OAuth2 refresh token'

### publishTarget:
**Not**-required 
Who is allowed to get the extension
publishTarget="trustedTesters" or publishTarget="default"

### only-upload:
**Not**-required 
Should only upload to Chrome webstore and not publish
Defaults to false

## Example usage

```yaml
jobs: 
  Deploy-to-chrome-webstore: 

    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Upload and publish extension to Chrome Webstore
      uses: Rabatta-ApS/ChromeWebstorePublish-action@1.3

      with:
        path-to-extension-folder: <path>
        extension-id: <APP_ID>
        client-id: <CLIENT_ID>
        client-secret:  <CLIENT_SECRET> 
        refresh-token: <REFRESH_TOKEN> 
        publishTarget: <target>
```
