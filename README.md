# Edge Impulse Mobile acquisition and inferencing client

Capture sensor data straight from your phone into Edge Impulse

## Installation

To build:

1. Install dependencies:

    ```
    $ npm install
    ```

1. Build the client:

    ```
    $ npm run watch
    ```

1. Run a web server:

    ```
    $ cd public
    $ python -m SimpleHTTPServer
    ```

1. You'll need to be connected over HTTPS to access sensors (at least on iPhone), use ngrok to open up your web browser to the world via:

    ```
    $ ngrok http 8000
    ```

Go to the HTTPS URL that ngrok printed to see the client.

## Todo

- [x] Connect to Remote Management endpoint
- [x] Capture accelerometer data
- [ ] Fix/determine accelerometer frequency
- [ ] Capture audio
- [x] Send sample to ingestion api
- [x] UI
- [ ] Pretty UI
- [ ] Reconnect WebSocket
- [ ] On-device inferencing

## Endpoint

https://edgeimpulse.z6.web.core.windows.net

Supported URL parameters:

- [optional] ``apiKey``
- [optional] ``remoteManagement``
- [optional] ``ingestionApi``
